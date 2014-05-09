var passport = require('passport');
var _ = require('underscore');
var graph = require('fbgraph');
var Twit = require('twit');
var User = require('../models/User');
var Event = require('../models/Event');
var async = require('async');
var secrets = require('../config/secrets');


var FB_APP_ACCESS_TOKEN = '';



exports.queryAllEvents = function(next) {
  Event.find({}, function(err, results) {
    if (err) {
      console.log(err);
      //req.flash('errors', { msg: 'Failed to get events from server!' });
      return next(err);
    }
    //console.log(results);
    results = results.sort(sortStartTimeAscending);
    return next(null, results);
    //return res.json(result);
  });
};

exports.getSearchEvents = function(req, res) {


};



/**
 * Sorts by start time in ascending order
 */

var sortStartTimeAscending = function (a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return new Date(a.start_time) - new Date(b.start_time);
};

/**
 * Sorts by start time in descending order
 */

var sortStartTimeDescending = function (a, b) {
  return new Date(a.start_time) - new Date(b.start_time);
};


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

  //if (!isImageUrl(req.body.img_url)) {
  //  req.body.img_url ='';
  //}

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
  var eventTags = req.body.event_tags;

  if (eventTags.indexOf('#') >= 0) {
    eventTags = eventTags.split('#');
  } else if (eventTags.indexOf(',') >= 0) {
    eventTags = eventTags.split(',');
  } else if (eventTags.indexOf(' ') >= 1) {
    eventTags = eventTags.split(' ');
  } else if (eventTags == ''){
    eventTags = [];
  } else {
    eventTags = [eventTags];
  }
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
  var token;
  if (req.user && req.user.tokens) {
    token = _.findWhere(req.user.tokens, { kind: 'facebook' });
  }
  // If logged in, can use app token
  token = (token) ? token : FB_APP_ACCESS_TOKEN;
  // Store event information in DB and render the next page using the event info
  retrieveFacebookEvent(token, fbEventId, eventImgUrl, eventTags, renderEventPage);


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
var retrieveFacebookEvent = function(token, fbEventId, eventImgUrl, eventTags, next) {
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
    evData.tags = eventTags;

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
  *Get an App access token
  *
  **/
var getAppAccessToken = function(next) {
  var appId = secrets.facebook.clientID;
  var appSecret = secrets.facebook.clientSecret;

  var graphUrl = 'oauth/access_token?' +'client_id=' + appId
    + '&client_secret='+ appSecret + '&grant_type=client_credentials';
  console.log(graphUrl);
  graph.get(graphUrl, function(err, data) {
    console.log(data);
    if (data.access_token)
      FB_APP_ACCESS_TOKEN = {accessToken: data.access_token};
      if (next) return next(FB_APP_ACCESS_TOKEN);
  });
};


/**
 * Create Mock Data
 *
 **/
var initMockEvents = function(token) {
  var evs =[
  { id:'290221901141692', tags: ['yoga', 'GAPSA', 'Penn', 'UPenn', 'med']},
  { id:'222000127991070', tags: []},
  { id:'665665826820952', tags: ['Makuu', 'African American Arts Alliance', 'UPenn', 'Penn']},
  { id:'677388215664345', tags: ['Philadelphia', 'Old City', '#NightMkt']},
  { id:'238987889620233', tags: ['Disconnects', 'Penn', 'BYO', 'UPenn']},
  { id:'697815326942814', tags: ['CIS', 'UPenn', 'hackathon']},
  { id:'286118688231403', tags: ['CIS', 'Adi Dahiya', 'WICS', 'UPenn', 'Typography', 'Computer Science']},
  { id:'704623692930003', tags: ['UPenn', 'Adi Dahiya', 'Doorman', 'Houston Hall', 'Product Design' ]},
  { id:'269620723198855', tags: ['UPenn', 'La Casa Latina', 'ARCH', 'PAACH', 'QPOC']},
  { id:'302832049867374', tags: ['New York Times', 'Philadelphia', 'Visualization', 'Data', 'CG@Penn', 'Levine Hall', 'CS']},
  { id:'529992310440512', tags: ['UPenn', 'Penn Museum', 'Harrison Auditorium', 'a cappella', 'music', 'singing', 'counterparts']},
  ];

  for (var i =0; i <evs.length; i++) {
    var e = evs[i];
    retrieveFacebookEvent(token, e.id, '', e.tags, function(err, res) {
      if (err) console.log(err);
      if (res) {
          var next = function(err, data) {
            if (err) console.log('twitter error', err);
            if (data) {
              res.tweets = data.statuses;
              console.log('twitter data', data);
              res.save();
            }
          };

          // Init twitter api call
          // var token = _.findWhere(req.user.tokens, { kind: 'twitter' });
          var T = new Twit({
            consumer_key: secrets.twitter.consumerKey,
            consumer_secret: secrets.twitter.consumerSecret,
            access_token: secrets.twitter.accessToken,
            access_token_secret: secrets.twitter.accessTokenSecret
          });

          // Make call
          var qValue =  res.name.split(' ').join(' OR ') + " OR " + res.tags.join(' OR ');

          T.get('search/tweets', { q: qValue +' since:' + res.start_time.substring(0, 10), count: 10 }, function(err, reply) {
            if (err) return next(err);
            if (reply) next(null, reply);
          });
        }
    });
  }

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

// clearEventModel();
getAppAccessToken(initMockEvents);
