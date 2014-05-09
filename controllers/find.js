var _ = require('underscore');
var eventsController = require('./events');


/**
 * GET /
 * Home page.
 */

exports.find = function(req, res) {
  var renderFxn = function(err, data) {
    res.render('find', {
      title: 'Find Events',
      events: data
    });
  };
  eventsController.queryAllEvents(renderFxn);
};
