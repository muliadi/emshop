function fetchShop(cb) {
  $.get('api/fetch_shop', function (shop) {
    cb(shop);
  });
}
function fetchProductsList(opt, cb) {
  opt = opt || {};
  var seperator = ',';
  var brand = opt.brand,
    tags = opt.tags,
    types = opt.types,
    keyword = opt.keyword,
    orderVal = opt.orderVal,
    orderKey = opt.orderKey;
  $.get('api/fetch_items', function (items) {
    // select items
    if (brand != null) {
      items = _.where(items, { brand: brand });
    }
    if (tags != null) {
      items = _.filter(items, function (item) {
        return 1 <= _.intersection(item.tags, tags).length;
      });
    }
    if (types != null) {
      items = _.filter(items, function (item) {
        return 1 <= _.intersection(item.types, types).length;
      });
    }
    if (keyword != null) {
      keyword = keyword.replace(seperator, '');
      items = _.filter(items, function (item) {
        return item.brand.indexOf(keyword) > -1 ||
          item.tags.join(seperator).indexOf(keyword) > -1 ||
          item.title.indexOf(keyword) > -1 ||
          item.description.indexOf(keyword) > -1;
      });
    }
    _.each(items, function (item) {
      item._lottery = _.contains(item.tags, '抽奖');
      item._seckill = _.contains(item.tags, '秒杀');
      calcLimit(item);
      calcPrice(item);
    });
    // sort items
    if (orderKey != null) {
      var field = ({
        'id': 'id',
        'sales': 'sales',
        'price': '_price'
      })[orderKey];
      items = _.sortBy(items, function (item) {
        return orderVal * item[field];
      });
    }
    cb(items);
  });
}
function fetchProduct(opt, cb) {
  fetchProductsList(null, function (items) {
    var item = _.findWhere(items, { id: opt.id });
    cb(item);
  });
}
function fetchCart(cb) {
  fetchCartItems(function(cItems) {
    if (cItems.length <= 0) {
      return cb(cItems);
    }
    fetchProductsList(null, function (dItems) {
      var xItems = _.map(cItems, function (cItem) {
        var dItem = _.findWhere(dItems, { id: cItem.id });
        if (!dItem) {
          return null;
        }
        var xItem = _.extend(cItem, {
          title: dItem.title,
          _lottery: dItem._lottery,
          _limit: dItem._limit,
          image: dItem.image,
          store: dItem.store,
          onSale: dItem.onSale,
          _price: dItem._price
        });
        return xItem;
      });
      cb(_.compact(xItems));
    });
  });
}
function fetchCurrOrder(cb) {
  fetchCurrOrderItems(function(oItems) {
    fetchProductsList(null, function (dItems) {
      var xItems = _.map(oItems, function (cItem) {
        var dItem = _.findWhere(dItems, { id: cItem.id });
        if (!dItem) {
          return null;
        }
        var xItem = _.extend(cItem, {
          _price: dItem._price
        });
        return xItem;
      });
      cb(_.compact(xItems));
    });
  });
}
function fetchOrdersList(cb) {
  $.get('api/fetch_orders', function(orders) {
    if (orders.length <= 0) {
      return cb(orders);
    }
    fetchProductsList(null, function (items) {
      var xOrders = _.map(orders, function (order) {
        order.items = _.map(order.items, function (oItem) {
          var item = _.findWhere(items, { id: oItem.id });
          return item ? _.extend(oItem, {
            title: item.title,
            image: item.image
          }) : null;
        });
        order.items = _.compact(order.items);
        return order;
      });
      cb(_.compact(xOrders));
    });
  });
}
function checkAllOnSale(oItems, cb) {
  fetchProductsList(null, function (items) {
    cb(_.every(oItems, function (oItem) {
      var item = _.findWhere(items, { id: oItem.id });
      return checkOnSale(item, oItem.num);
    }));
  });
}
function fetchOrderInfo(cb) {
  var info = store.get('order_info');
  cb(info);
}
function saveOrder(oItems, info, cb) {
  info.area = info.area.replace(/站$/, '');
  saveOrderInfo(
    _.omit(info, ['message']),
    function () {
      $.post('api/create_order', {
        items: oItems,
        info: info
      }, function (data) {
        cb(data === 'ok');
      });
    }
  );
}
function fetchAreasList(cb) {
  fetchShop(function (shop) {
    cb(shop.areas);
  });
}
function saveData(data, cb) {
  fetchOrderInfo(function(info) {
    info.area = data.area.title;
    saveOrderInfo(info, function() {
      cb(true);
    });
  });
}
function setDormsList(cb) {
  cb(); // do nothing
}
function linkAfterOrder(id) {
  link('orders/');
}
function actionOrder(id, action, cb) {
  $.post('api/action_order', {
    id: id,
    action: action
  }, function(data) {
    cb(data === 'ok');
  });
}
function checkCoupon(code, cb) {
  $.get('api/check_coupon', {
    code: code
  }, function(data) {
    if (!data) return cb(false);
    data.message = data.title +
      ',还可以使用' + data.times + '次';
    cb(data);
  });
}
