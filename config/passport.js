const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/User");

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: "phone" }, 
      async (phone, password, done) => {
        try {
          const user = await User.findOne({ phone });
          if (!user) return done(null, false, { message: "User not found" });

        
          if (!user.admin || user.admin <= 0) {
            return done(null, false, { message: "Access denied. Not an admin user." });
          }

      

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) return done(null, false, { message: "Incorrect password" });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
