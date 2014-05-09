var _ = require('underscore');
var eventsController = require('./events');


/**
 * GET /
 * Home page.
 */

exports.find = function(req, res) {
  var searchValues = '';
  var renderFxn = function(err, data) {
    res.render('find',
      {
        title: 'Find Events',
        events: data,
        search_values: searchValues
      });
  };
  eventsController.queryAllEvents(renderFxn);
};



exports.postFind = function(req, res) {
  var searchValues = '';
  if (req.body && req.body.search) searchValues = req.body.search;
  var renderFxn = function(err, data) {
    res.render('find',
      {
        title: 'Find Events',
        events: data,
        search_values: searchValues
      });
  };
  eventsController.searchforEvents(searchValues, renderFxn);
};
