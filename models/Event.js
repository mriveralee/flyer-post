var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');

var  fbBaseEventUrl = 'http://www.facebook.com/'

var eventSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  description: String,
  privacy: String,
  owner: String,
  event_photo: String,
  cover_photo: String,
  start_time: Number,
  end_time: Number,
  location: String,
  is_date_only: Boolean,
  ticket_uri: String,
  updated_time: Number,
  timezone: String,
  venue: String,
  attending: Array,
  feed: Array,
  photos: Array,
});

// TODO: Get event details from the FB Events API
// TODO: Store in our DB
// TODO: Return results to the pages


// TODO: Make function


/**
 * Hash the password for security.
 */

eventSchema.pre('save', function(next) {
  var user = this;
  var SALT_FACTOR = 5;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

/**
 *  Get a URL to a user's Gravatar email.
 */

userSchema.methods.gravatar = function(size, defaults) {
  if (!size) size = 200;
  if (!defaults) defaults = 'retro';
  var md5 = crypto.createHash('md5').update(this.email);
  return 'https://gravatar.com/avatar/' + md5.digest('hex').toString() + '?s=' + size + '&d=' + defaults;
};

module.exports = mongoose.model('Event', eventSchema);
