var slackbot = require('./lib/bot');
var http = require('http');
var querystring = require('querystring');
var request = require('request');
var config = {
    server: 'irc.freenode.com',
    nick: 'slackbot',
    username: 'g0vslackbot',
    token: process.env.TOKEN ||'', // get from https://api.slack.com/web#basics
    income_url: process.env.INCOME_URL || '',
    outcome_token: process.env.OUTCOME_TOKEN || '',
    channels: {
        '#g0v.tw': '#general'
    },
    users: {
    },
    // optionals
    floodProtection: true,
    silent: false // keep the bot quiet
};
var slackUsers = {};
var slackChannels = {};
function updateLists () {
  request.get({
      url: 'https://slack.com/api/users.list?token=' + config.token
  }, function (error, response, body) {
    var res;

    try {
      res = JSON.parse(body);
    } catch (e) {
      console.log('failed to parse the member list:', body);
      console.error(e);
    }

    if (res && res.members) {
      console.log('members updated:', new Date());
      res.members.map(function (member) {
        slackUsers[member.id] = member.name;
      });
    }
  });

  request.get({
      url: 'https://slack.com/api/channels.list?token=' + config.token
  }, function (error, response, body) {
    var res;

    try {
      res = JSON.parse(body);
    } catch (e) {
      console.log('failed to parse the channel list:', body);
      console.error(e);
    }

    if (res && res.channels) {
      console.log('channels updated:', new Date());
      res.channels.map(function (channel) {
        slackChannels[channel.id] = channel.name;
      });
    }
  });

  setTimeout(function () {
    updateLists()
  }, 10 * 60 * 1000);
}

updateLists();
var slackbot = new slackbot.Bot(config);
slackbot.listen();

var server = http.createServer(function (req, res) {
  if (req.method == 'POST') {
    req.on('data', function(data) {
      var payload = querystring.parse(data.toString());
      if (payload.token == config.outcome_token && payload.user_name != 'slackbot') {
        var ircMsg = "<" + payload.user_name + "> " + payload.text;
        var channel = Object.keys(config.channels)[0];
        console.log(channel, ircMsg);
        //  "[-a-z0-9@:%_\+\.~#?&//=]{2,256}.[a-z]{2,4}\b\/[-a-z0-9@:%_\+.~#?&//=]*"
        //var url = "[-a-z0-9@:%_\\+\.~#?&//=]{2,256}\\.[a-z]{2,4}\\b\\/[-a-z0-9@:%_\\+.~#?&//=]*";
        //var re = new RegExp("<(" + url + ")>","gi");
        /*
         * Channel ID -> Channel Name
         * Member ID -> Member Name
         * decoed URL and remove <, >
         */
        ircMsg = ircMsg.replace(/<#C\w{8}>/g, function (matched) {
          var channel_id = matched.match(/#(C\w{8})/)[1];
          return '#' + slackChannels[channel_id];
        }).replace(/<@U\w{8}>/g, function (matched) {
          var member_id = matched.match(/@(U\w{8})/)[1];
          return '@' + slackUsers[member_id];
        })
          .replace(/&amp;/g,'&')
          .replace(/&lt;/g,'<')
          .replace(/&gt;/g, '>')
          .replace(/<(https:\/\/[-a-zA-Z0-9@:%_+.~#?&=\/]*)(?:\|([^>]*))?>/g, '$1');

        slackbot.speak(channel, ircMsg);
        res.end('done');
      }
      res.end('request should not be from slackbot or must have matched token.')
    });
  } else {
    res.end('recieved request (not post)');
  }
});

server.listen(5555);
console.log("Server running at http://localhost:5555/");
