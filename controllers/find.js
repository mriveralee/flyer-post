/**
 * GET /
 * Home page.
 */

exports.find = function(req, res) {
  res.render('find', {
    title: 'Find Events'
  });
};
