Sites = new Mongo.Collection('sites');
Posts = new Mongo.Collection('posts');

if (Meteor.isClient) {
  // set global site variable
  site = location.hostname;
  console.log(site);
  Meteor.call('setSite', site, function (error, result) {
    Meteor.subscribe("currentSite-" + site);
    Meteor.subscribe("SitePosts-" + site);
  });

  Meteor.startup(function () {
    $(window).on('focus', function () {
      Meteor.call('updateSite', site, function (error, result) {
        console.log("set site to " + site)
      })
    }),
    $(window).on('blur', function () {
      console.log("left window")
    })
  });

  Template.hello.helpers({
    site: function () { // get site info for current site
      return Sites.findOne();
    },
    posts: function () { // get posts for current site
      return Posts.find();
    }
  });

  Template.hello.events({
    'click button': function () {
      // insert some fake data
      Posts.insert({title: site + ' <-> ' + Fake.sentence(5)})
    }
  });
}

if (Meteor.isServer) {
  Meteor.methods({
    setSite: function (hostname) { // meteor method to setup publications
      console.log(hostname);
      Meteor.publish("currentSite-" + hostname, function () {
        var site = Sites.find({host: hostname});
        siteId = site.fetch()[0]._id; // set this to use in other publications
        return site;
      });
      Meteor.publish("SitePosts-" + hostname, function () {
        return Posts.find({siteId: siteId});
      });
    },
    updateSite: function(hostname) {
      var site = Sites.find({host: hostname});
      siteId = site.fetch()[0]._id; 
      console.log(siteId);
    }
  });

  // hack to insert the siteId in every document
  Posts.deny({
    insert: function (userId, doc) {
      doc.siteId = siteId; // append siteId to document
      /*
       * The problem here is siteId will always be the latest you've opened.
       * If you open http://localhost:3000, then you open http://127.0.0.1:3000
       * in another tab, siteId will be set to the 127.0.0.1-site and thus not
       * updating the localhost one correctly.
       *
       * The simplest solution would be to set hostname on insert like
       * Posts.insert({title: site + ' <-> ' + Fake.sentence(5), hostname: site})
       * but it's not the best of solutions.
       *
       * One solution would be to look at focus/blur on the window event
       */
      return false; // return false to avoid deny
    }
  });
  Posts.allow({ // have to have allow to use deny
    insert: function (userId, doc) {
      return true;
    }
  });

  Meteor.startup(function () {
    if(Sites.find().count() === 0) { // seed database with some fake data
      var sites = [
        { host: '127.0.0.1', name: 'Ip based site' },
        { host: 'localhost', name: 'localhost city' }
      ];
      sites.forEach(function(element){
        var siteId = Sites.insert(element);
        Posts.insert({siteId: siteId, title: "My post for " + siteId});
      });
    }
  });
}