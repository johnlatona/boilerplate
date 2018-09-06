const router = require('express').Router();
const User = require('../db/models/user');

router.get('/me', async (req, res, next) => {
  res.json(req.user);
})

router.post('/signup', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    req.login(user, err => {
      if (err) next(err);
      else res.json(user);
    })
  }
  catch(err) {
    next(err);
  }
})

router.put('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {
        email: req.body.email
      }
    });

    if (!user) {
      res.status(401).send('User not found');
    }
    else if (!user.hasMatchingPassword(req.body.password)) {
      res.status(401).send('Incorrect password');
    }
    else {
      req.login(user, err => {
        if (err) next(err);
        else res.json(user);
      })
    }
  }
  catch(err) {
    next(err);
  }
})

router.delete('/logout', (req, res, next) => {
  req.logout();
  req.session.destroy();
  res.sendStatus(204);
})

module.exports = router;


