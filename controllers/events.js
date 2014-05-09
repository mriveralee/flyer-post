var passport = require('passport');
var _ = require('underscore');
var graph = require('fbgraph');
var User = require('../models/User');
var Event = require('../models/Event');
var async = require('async');


/**
 * GET /event/create
 * Create Event Page form
 */

exports.getCreateEvent = function(req, res) {
  res.render('events/create', {
    title: 'Create Event'
  });
};

/**
 * POST /events/create
 * Create an event page
 * @param fb_url - the fb url of the event
 **/
exports.postCreateEvent = function(req, res) {
  // Read FB url from the post and get all of the other information using the api calls.
  req.assert('fb_url', 'Facebook Event Url cannot be blank').notEmpty().isUrl();
  //req.assert('img_url', 'Event Image Url cannot be blank').notEmpty();

  if (!isImageUrl(req.body.img_url)) {
    req.body.img_url ='';
  }

  // req.assert('img_url', 'Event Image Url must be an image').notEmpty();

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

  var eventImgUrl = req.body.img_url;

  // Callback to render event page, if necessary
  var renderEventPage = function(err, eventData) {
    if (err) {
      if (err.code === 11000) {
        console.log(err);
        req.flash('errors',
          { msg: 'This event already exists.' });
        // Return to create page and show errors
      } else {
        req.flash('errors', { msg: err.msg });
      }
      return res.redirect('/events/create');
    } else if (!isFacebookEvent(eventData)) {
      // Show an error for an invalid fb url
      req.flash('errors',
        [{ param: 'fbEventUrl',
           msg: 'Invalid Facebook Event URL',
           value: (eventData && eventData.fbId) ? eventData.fbId : null
         }]
       );
      // Redirect to the create page & show errows :)
      return res.redirect('/events/create');
    }

    // Otherwise show the newly created events page
    req.flash('success', { msg: 'Event created.' });
    return res.redirect('/events/view/' + eventData.fbId);
  };

  // Grab the FB access token
  var token = _.findWhere(req.user.tokens, { kind: 'facebook' });

  // Store event information in DB and render the next page using the event info
  retrieveFacebookEvent(token, fbEventId, eventImgUrl, renderEventPage);


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
    req.flash('success', { msg: 'Event Deleted.' });
    return res.redirect('/');
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
      useEventCover: false,
      useEventPicture: true
    });
  });
};


//------------------------------------------------------------------------------
/**
 * Facebook Event Url Query Params
 */
var FB_EVENT_PARAMS = '/?fields=cover,id,name,owner,description,privacy,start_time,end_time,location,is_date_only,ticket_uri,venue,picture';
var FB_EVENT_PICTURE_EDGE = '/picture?redirect=0&type=large'
//------------------------------------------------------------------------------


/**
 * Retrieves a Facebook event from the FB API
 *
 **/
var retrieveFacebookEvent = function(token, fbEventId, eventImgUrl, next) {
  if (!token) {
    next({msg: 'You must be signed in to Facebook!', code: 9999});
    return;
  }
  async.parallel({
    event: function(callback) {
      // Set the access token
      graph.setAccessToken(token.accessToken);
      graph.get(fbEventId + FB_EVENT_PARAMS, function(err, eventData) {
        if (err) return callback(err);
        if (!isFacebookEvent(eventData)) {
          err = {msg: 'Invalid Facebook Event', code: 9999};
          return callback(err);
        }
        return callback(null, eventData);
      });
    },
    picture: function(callback) {
      // Set the access token
      graph.setAccessToken(token.accessToken);
      graph.get(fbEventId + FB_EVENT_PICTURE_EDGE, function(err, pictureData) {
        if (err) return callback(err);
        // Store the Event in our Database
        var pic = (pictureData && pictureData.data && pictureData.data.url)
          ? pictureData.data.url : '';
        return callback(null, pictureData);
      });
    }
  }, function(err, results) {
    if (err) {
      console.log(err, 'In async cb');
      return next(err);
    }
    var evData = sanitizeFacebookEvent(results.event);
    var picData = sanitizeFacebookEventPhoto(results.picture);
    evData.picture = picData;

    // console.log(eventData);
    var dbEvent = new Event(evData);

    dbEvent.save(function(nErr) {
      if (nErr) {
        console.log(nErr, 'db Save');
        return next(nErr);
      }
      // Now render the page
      return next(null, dbEvent);
    });

    //dbEvent.picture = picData;

    //dbEvent.save

    console.log (dbEvent);
    //dbEvent.img_url = eventImgUrl;
    // Save in DB

  });
};


/**
 * Sanitize FB Event Data
 *
 **/
 var sanitizeFacebookEvent = function(fbEvent) {
   var ev = {};
   ev.cover = fbEvent.cover;
   ev.fbId = fbEvent.id;
   ev.name = fbEvent.name;
   ev.owner = fbEvent.owner;
   ev.description = fbEvent.description;
   ev.privacy = fbEvent.privacy;
   ev.start_time = fbEvent.start_time;
   ev.end_time = fbEvent.end_time;
   ev.location = fbEvent.location;
   ev.is_date_only = fbEvent.is_date_only;
   ev.ticket_uri = fbEvent.ticket_uri;
   ev.venue = fbEvent.venue;
   return ev;
 };

 /**
  * Sanitize FB Event Photo
  *
  **/
var sanitizeFacebookEventPhoto = function(pictureData) {
  var photo = (pictureData && pictureData.data && pictureData.data.url)
    ? pictureData.data.url : '';

  return photo;
};



/**
 * Test if a set of data is an FB Event data
 *
 **/
var isFacebookEvent = function(eventData) {
  if (!eventData) return false;
  // console.log(eventData.privacy);
  return eventData.owner && eventData.description && eventData.name && eventData.privacy == 'OPEN';
};

/**
 * Check if something is an image url
 */
 var isImageUrl = function (str) {
    return (str.match(/\.(jpeg|jpg|gif|png)$/) != null);
 };



/**
 * Clear the Event Model
 *
 **/
var clearEventModel = function() {
  Event.remove({}, function(err, rm) {
    console.log('Event Collection removed', rm);
  });
};

clearEventModel();
