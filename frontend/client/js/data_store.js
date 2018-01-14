var dataStore = (function () {
  var Y = 1000;
  var _data = [];
  var _subscribers = [];

  return {
    getPixel: function (x, y) { // 0 indexed
      if (_data[y * Y + x] === undefined) {
        return null;
      } else {
        return {
          pixel: {
            colour: _data[y * Y + x],
            user: {
              address: '0x00000000'
            }
          }
        }
      }
    },
    setPixel: function(x, y, color) {
      _data[y * Y + x] = color;
      for (var i in _subscribers) {
        _subscribers[i](x, y, color);
      }
    },
    getCanvas: function() {
      return _data;
    },
    subscribe: function (handler) {
      _subscribers.push(handler);
    }
  }
})();