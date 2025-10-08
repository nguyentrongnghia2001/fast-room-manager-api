Controllers

Purpose
- Hold HTTP request/response handlers.
- Keep controllers thin: parse input from req, call services for business logic, and return responses.
- Avoid complex business logic here; move it to services.

Conventions
- Use async/await and forward errors via next(err) so the global errorHandler can respond consistently.
- Do not access the database directly from controllers; use services.
- Validate payloads in dedicated validation middlewares (e.g., Joi or Zod) before reaching controllers.

Examples
- listRooms(req, res, next): calls service to fetch rooms and returns JSON.
- createRoom(req, res, next): reads req.body, calls service to create a room, returns 201 with the created entity.

Skeleton
// roomsController.js
exports.listRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.list();
    res.json({ data: rooms });
  } catch (err) {
    next(err);
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const room = await roomService.create(req.body);
    res.status(201).json({ data: room });
  } catch (err) {
    next(err);
  }
};