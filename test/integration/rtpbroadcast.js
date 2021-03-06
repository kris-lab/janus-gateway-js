describe('Rtpbroadcast tests', function() {
  var janusConnection;
  var janusSession;
  var rtpbroadcastPlugin;

  var mountpointOptions = {
    name: 'Delete me',
    description: 'I must be deleted soon',
    recorded: true,
    streams: [{
      "audiopt": 111,
      "audiortpmap": "opus/48000/2",
      "videopt": 100,
      "videortpmap": "VP8/90000"
    }]
  };

  function randomMountpointId() {
    return Math.random().toString(36).substring(2, 12);
  }

  before(function(done) {
    $('body').append('<video id="video" autoplay></video>');

    jQuery.getJSON('./config.json')
      .then(function(config) {
        var janus = new Janus.Client(config.url, config);
        return janus.createConnection('client');
      })
      .then(function(connection) {
        janusConnection = connection;
        return connection.createSession();
      })
      .then(function(session) {
        janusSession = session;
        done();
      });
  });

  after(function(done) {
    $('#video').remove();

    janusSession.destroy()
      .then(function() {
        return janusConnection.close();
      })
      .then(done);
  });

  beforeEach(function(done) {
    janusSession.attachPlugin(Janus.RtpbroadcastPlugin.NAME)
      .then(function(plugin) {
        rtpbroadcastPlugin = plugin;
        done();
      });
  });

  afterEach(function(done) {
    rtpbroadcastPlugin.detach().then(done);
  });

  it('creates, lists and destroys', function(done) {
    var mountpointId = randomMountpointId();
    rtpbroadcastPlugin.create(mountpointId, mountpointOptions)
      .then(function(response) {
        assert.equal(response.getData('created'), mountpointOptions['name']);
        return rtpbroadcastPlugin.list(mountpointId);
      })
      .then(function(response) {
        var list = response.getData('list');
        var createdMountpoint = jQuery.grep(list, function(mountpoint) {
          return mountpoint.id == mountpointId;
        });
        assert.equal(createdMountpoint.length, 1);
        return rtpbroadcastPlugin.destroy(mountpointId);
      })
      .then(function(response) {
        assert.equal(response.getData('destroyed'), mountpointId);
        done();
      });
  });

  it('streams video', function(done) {
    this.timeout(20000);
    var video = document.getElementById('video');
    video.addEventListener('playing', function() {
      done();
    });
    rtpbroadcastPlugin.on('pc:addstream', function(event) {
      assert(event.stream);
      require('webrtc-adapter').browserShim.attachMediaStream(video, event.stream);
    });

    var mountpointId = randomMountpointId();
    rtpbroadcastPlugin.create(mountpointId, mountpointOptions)
      .then(function() {
        return rtpbroadcastPlugin.watch(mountpointId);
      })
      .then(function() {
        return rtpbroadcastPlugin.start();
      })
      .delay(300)
      .then(function() {
        return rtpbroadcastPlugin.stop();
      });
  });

  it('pauses, starts, stops and destroys', function(done) {
    this.timeout(5000);
    var mountpointId = randomMountpointId();
    rtpbroadcastPlugin.create(mountpointId, mountpointOptions)
      .then(function() {
        return rtpbroadcastPlugin.watch(mountpointId);
      })
      .delay(300)
      .then(function() {
        return rtpbroadcastPlugin.pause();
      })
      .delay(300)
      .then(function() {
        return rtpbroadcastPlugin.start();
      })
      .delay(300)
      .then(function() {
        return rtpbroadcastPlugin.stop();
      })
      .then(function() {
        done();
      });
  });

});
