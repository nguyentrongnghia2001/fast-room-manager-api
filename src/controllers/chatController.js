const { StatusCodes } = require('http-status-codes');
const { successHandler } = require('../middlewares/responseState');
const serviceChat = require('../services/serviceChat');
const ApiError = require('../utils/ApiError');

/**
 * Handle user chat message (RAG pipeline)
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { message, sessionId, stream } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Field "message" is required and must not be empty');
    }

    const userId = req.user?.id || null;
    const isStream = stream === true || req.headers.accept === 'text/event-stream';

    if (isStream) {
      // Setup Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const result = await serviceChat.processChatMessage({
        message: message.trim(),
        sessionId,
        userId,
        stream: true,
        onToken: (token) => {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        },
      });

      res.write(`data: ${JSON.stringify({ done: true, sessionId: result.sessionId, sources: result.sources })}\n\n`);
      res.end();
    } else {
      const result = await serviceChat.processChatMessage({
        message: message.trim(),
        sessionId,
        userId,
        stream: false,
      });

      return res
        .status(StatusCodes.OK)
        .json(successHandler(StatusCodes.OK, result, 'Message processed successfully'));
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Get conversation history by session ID
 */
exports.getHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Session ID is required');
    }

    const history = await serviceChat.getChatHistory(sessionId);
    return res
      .status(StatusCodes.OK)
      .json(successHandler(StatusCodes.OK, history, 'Chat history retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Clear conversation history by session ID
 */
exports.clearHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Session ID is required');
    }

    await serviceChat.clearChatHistory(sessionId);
    return res
      .status(StatusCodes.OK)
      .json(successHandler(StatusCodes.OK, null, 'Chat history cleared successfully'));
  } catch (err) {
    next(err);
  }
};
