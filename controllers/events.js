var passport = require('passport');
var _ = require('underscore');
var graph = require('fbgraph');
var User = require('../models/User');
var Event = require('../models/Event');


/**
 * GET /event/create
 * Create Event Page form
 */

exports.getCreateEvent = function(req, res) {
  res.render('events/create', {
    title: 'Create Event - FlyerPost'
  });
};

/**
 * POST /events/create
 * Create an event page
 * @param fb_url - the fb url of the event
 **/
exports.postCreateEvent = function(req, res) {
  // Read FB url from the post and get all of the other information using the api calls.
  req.assert('fb_url', 'Facebook Event URL cannot be blank').notEmpty();
  //req.assert('email', 'Email is not valid').isEmail();
  //req.assert('message', 'Message cannot be blank').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/events/create');
  }
  // Regex to match full url, (except end where the event id is)
  var regex1 =
    /(?:(?:http|https):\/\/)?(?:www.)?facebook.com\/(?:(?:\w)*#!\/)?(?:events\/)?/;
  // Regex to isolate the id
  var regex2 = /\/.*/;

  // Get fb event id from the url
  var fbEventUrl = req.body.fb_url;
  var fbEventId = fbEventUrl.replace(regex1, '').replace(regex2, '');

  // Callback to render event page, if necessary
  var renderEventPage = function(err, eventData) {
    if (err || !isFacebookEvent(eventData)) {
      // Go to create events page if not an actual facebook event & flash error
      if (err.code === 11000) {
        req.flash('errors', { msg: 'Event with that url already exists.' });
      } else {
        // Show an error for an invalid fb url
        req.flash('errors',
          [{ param: 'fbEventUrl',
             msg: 'Invalid Facebook Event URL',
             value: (eventData && eventData.fbId) ? eventData.fbId : null
           }]);
      }

      // Redirect to the create page & show errows :)
      return res.redirect('/events/create');
    }

    // Otherwise show the newly created events page
    res.redirect('/events/view/' + eventData.fbId);
  };

  // Grab the FB access token
  var token = _.findWhere(req.user.tokens, { kind: 'facebook' });

  // Store event information in DB and render the next page using the event info
  retrieveFacebookEvent(token, fbEventId, renderEventPage);


};

/**
 * DELETE /events/delete
 * Deletees an event route
 **/
exports.deleteEvent = function(req, res, next) {
  // find event ID in DB and remove it
  console.log('DELETE Event')
  // Check if this user id is the owner then deleter
  return;
  Event.remove({ fbId: req.param.eventId, owner: req.user.id }, function(err) {
    if (err) return next(err);
    //req.logout();
    res.redirect('/');
  });

};



/**
 * GET /events/:id
 * Displays an event by its id
  **/
exports.getEvent = function(req, res, next) {
  // Get DB information using eventId
  var eventId =  req.params.eventId;
  Event.findOne({'fbId': eventId}, function(err, fbEvent) {
    if (err) return next(err);
    // Return home if the event does not exist
    if (!fbEvent) {
      return res.redirect('/');
    }
    // Otherwise render a page with the event information
    return res.render('events/view', {
      title: fbEvent.name + ' - FlyerPost',
      fbEvent: fbEvent,
    });
  });
};

//------------------------------------------------------------------------------
/**
 * Retrieves a Facebook event from the FB API
 *
 **/

var retrieveFacebookEvent = function(token, fbEventId, next) {
  if (!token) {
    next(err);
    return;
  }
  // Set the access token
  graph.setAccessToken(token.accessToken);
  graph.get(fbEventId, function(err, eventData) {
    if (err) return next(err);
    // Store the Event in our Database
    eventData.fbId = eventData.id;
    delete eventData.id;
    var dbEvent = new Event(eventData);

    dbEvent.save(function(err) {
      if (err) {
        return next(err);
      }

      // Now render the page
      return next(null, eventData);
    });
  });
};

/**
 * Test if a set of data is an FB Event data
 *
 **/

var isFacebookEvent = function(eventData) {
  if (!eventData) return false;
  return eventData.owner && eventData.description && eventData.name;
};

/**
 * Clear the Event Model
 *
 **/
var clearEventModel = function() {
  Event.remove({}, function(err) {
    console.log('Event Collection removed');
  });
};

clearEventModel();
