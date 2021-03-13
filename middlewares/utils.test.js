var utils = require('./utils');

var channels = {
  'C2PPMRQGP': 'cofacts'
};
var users = {
  'U039CG5S7': 'alice',
  'U1HJ8FJJJ': 'bob'
};

it('parse Slack usernames and channel names', function () {
  var source = '<@U039CG5S7> <@U1HJ8FJJJ> of <#C2PPMRQGP|cofacts>';
  expect(utils.textFromSlack(source, channels, users)).toBe('@alice @bob of #cofacts');
});
