var mongoose = require('mongoose');

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
  img_url: String,
  tags: Array
});

// TODO: Get event details from the FB Events API
// TODO: Store in our DB
// TODO: Return results to the pages
// TODO: Make function


/**
 * Hash the password for security.
 */


module.exports = mongoose.model('Event', eventSchema);
