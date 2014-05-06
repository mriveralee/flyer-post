var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');

var  fbBaseEventUrl = 'http://www.facebook.com/'

var eventSchema = new mongoose.Schema({
  fbId: { type: String, unique: true },
  name: String,
  description: String,
  privacy: String,
  owner: Object,
  event_photo: String,
  cover_photo: String,
  start_time: String,
  end_time: String,
  location: String,
  is_date_only: Boolean,
  ticket_uri: String,
  updated_time: String,
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



module.exports = mongoose.model('Event', eventSchema);
