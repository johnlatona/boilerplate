const express = require('express');
const morgan = require('morgan');
const path = require('path');
const app = express();
const db = require('./db');
const http = require('http');
const server = http.createServer(app);
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const dbStore = new SequelizeStore({ db: db });
const PORT = process.env.PORT || 1337;
const passport = require('passport');
const User = require('./db/models/user');

if (process.env.NODE_ENV === 'development') {
  require('./localSecrets');
}


db.sync()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server listening on PORT: ${PORT}`);
    })
  })


app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'a wildly insecure secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  try {
    done(null, user.id);
  }
  catch(err) {
    done(err);
  }
});

passport.deserializeUser( async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user)
  }
  catch(err) {
    done(err);
  }
})

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// collect our google configuration into an object
const googleConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
};

const strategy = new GoogleStrategy(googleConfig, function (token, refreshToken, profile, done) {
  const googleId = profile.id;
  const name = profile.displayName;
  const email = profile.emails[0].value;

  User.findOne({where: { googleId: googleId  }})
    .then(function (user) {
      if (!user) {
        return User.create({ name, email, googleId })
          .then(function (user) {
            done(null, user);
          });
      } else {
        done(null, user);
      }
    })
    .catch(done);
});

// register our strategy with passport
passport.use(strategy);

app.use('/api', require('./api'));

router.get('/auth/google', passport.authenticate('google', { scope: 'email' }));

router.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

app.get('*', (req, res, next) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  console.error(err.stack);
  res.status(err.status || 500).send(err.message || 'Internal Server Error.');
})

