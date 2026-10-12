import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { HttpError } from './errors.js';

const COOKIE_NAME = 'token';

/**
 * Cookie-based sessions. The token is a signed JWT in an httpOnly cookie, so page scripts
 * cannot read it, and SameSite=Lax keeps other sites from sending it with their requests.
 */
export function createSessions(config) {
  const maxAge = config.sessionDays * 24 * 60 * 60 * 1000;
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
  };

  return {
    start(res, user) {
      const token = jwt.sign({}, config.jwtSecret, {
        subject: String(user._id),
        expiresIn: `${config.sessionDays}d`,
      });
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge });
    },

    end(res) {
      res.clearCookie(COOKIE_NAME, cookieOptions);
    },

    /** Route guard: puts `req.user` ({ id, name, email }) on the request or answers 401. */
    async requireAuth(req, res, next) {
      const token = req.cookies?.[COOKIE_NAME];
      if (!token) throw new HttpError(401, 'Log in to continue.');

      let userId;
      try {
        userId = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }).sub;
      } catch {
        throw new HttpError(401, 'Your session has expired. Log in again.');
      }

      const user = await User.findById(userId).select('name email');
      if (!user) throw new HttpError(401, 'Your session has expired. Log in again.');

      req.user = { id: user._id, name: user.name, email: user.email };
      next();
    },
  };
}
