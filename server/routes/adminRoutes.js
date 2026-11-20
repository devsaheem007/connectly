import { Router } from "express";
import { body, param } from "express-validator";
import * as c from "../controllers/adminController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(protect, restrictTo("admin", "moderator"));

const id = param("id").isMongoId().withMessage("Invalid id");

// Platform statistics are admin-only.
router.get("/stats", restrictTo("admin"), c.getStats);

// Admins and moderators can manage user accounts within their permissions.
router.get("/users", c.listUsers);

router.put(
  "/users/:id",
  [
    id,
    body("role").optional().isIn(["user", "moderator", "admin"]),
    body("isActive").optional().isBoolean({ strict: true }),
    body("suspendedReason").optional().isString().isLength({ max: 140 }),
  ],
  validate,
  c.updateUser,
);

router.post("/users/:id/logout", [id], validate, c.forceLogout);
router.delete("/users/:id", [id], validate, c.deleteUser);

export default router;
