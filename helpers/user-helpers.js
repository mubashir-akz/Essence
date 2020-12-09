const bcrypt = require("bcrypt");
const { ObjectID, ObjectId } = require("mongodb");
const db = require("../config/connection");
const collections = require("../config/collections");
const moment = require("moment");
const Razorpay = require("razorpay");
var paypal = require("paypal-rest-sdk");
const { resolve } = require("path");
var instance = new Razorpay({
  key_id: "rzp_test_jsL70upb6RKmN0",
  key_secret: "xXiH38Uft4i4IXnfiJZhWiiG",
});
paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id:
    "AdIazLQnx_vhEv7CcW1voXsCxC7HQHFG4pxYy3Fl1aqSWEGtDL07bXSxGFRqIp1iuFuLG06VpEltRI1z", // please provide your client id here
  client_secret:
    "ECYopHgkVUZyWP8ek6Ii0POuI9-kfbuks6sFioNbZtsitMAyWPqWqHcSCqzf1bpZ9J20WN-OroNk1pbj", //// provide your client secret here
});

module.exports = {
  // eslint-disable-next-line no-async-promise-executor
  doSignup: (userdata) =>
    new Promise(async (resolve) => {
      const user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ email: userdata.email });
      if (user) {
        resolve({ status: "error" });
      } else {
        userdata.password = await bcrypt.hash(userdata.password, 10);
        db.get()
          .collection(collections.USER_COLLECTION)
          .insertOne(userdata)
          .then((data) => {
            resolve(data.ops[0]);
          });
      }
    }),
  doLogin: (userdata) =>
    new Promise(async (resolve, reject) => {
      const response = {};
      const user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ email: userdata.email });
      if (user) {
        if (user.userStatus != "blcoked") {
          bcrypt.compare(userdata.password, user.password).then((status) => {
            if (status) {
              response.user = user;
              response.status = true;
              resolve(response);
            } else {
              resolve({ status: false });
            }
          });
        } else {
          resolve({ status: false });
        }
      } else {
        resolve({ status: false });
      }
    }),
  addToCart: (ProId, userId) => {
    const proObj = {
      item: ObjectID(ProId),
      quantity: 1,
    };
    return new Promise(async (resolve) => {
      const usercart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: ObjectID(userId) });
      if (usercart) {
        const proExist = usercart.products.findIndex(
          (products) => products.item == ProId
        );
        if (proExist != -1) {
          db.get()
            .collection(collections.CART_COLLECTION)
            .updateOne(
              {
                user: ObjectId(userId),
                "products.item": ObjectId(ProId),
              },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collections.CART_COLLECTION)
            .updateOne(
              { user: ObjectID(userId) },
              {
                $push: {
                  products: proObj,
                },
              }
            )
            .then(() => {
              resolve();
            });
        }
      } else {
        const cartObj = {
          user: ObjectID(userId),
          products: [proObj],
        };
        db.get()
          .collection(collections.CART_COLLECTION)
          .insertOne(cartObj)
          .then(() => {
            resolve();
          });
      }
    });
  },
  getCartProducts: (userId) =>
    new Promise(async (resolve) => {
      const cartItems = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: {
              user: ObjectID(userId),
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "products",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              products: { $arrayElemAt: ["$products", 0] },
            },
          },
        ])
        .toArray();
      resolve(cartItems);
    }),
  getCartCount: (userId) =>
    new Promise(async (resolve) => {
      let count = 0;
      const cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: ObjectID(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    }),
  changeProductQuantity: (details) => {
    const count = parseInt(details.count);
    const quantity = parseInt(details.quantity);
    return new Promise((resolve) => {
      if (count === -1 && quantity === 1) {
      }
      db.get()
        .collection(collections.CART_COLLECTION)
        .updateOne(
          {
            _id: ObjectID(details.cart),
            "products.item": ObjectID(details.product),
          },
          {
            $inc: { "products.$.quantity": count },
          }
        )
        .then(() => {
          resolve({});
        });
    });
  },
  deleteFromCart: (details) =>
    new Promise((resolve) => {
      db.get()
        .collection(collections.CART_COLLECTION)
        .updateOne(
          { _id: ObjectID(details.carts) },
          {
            $pull: { products: { item: ObjectID(details.products) } },
          }
        )
        .then(() => {
          resolve({ removeProduct: true });
        });
    }),
  getTotalAmount: (userId) =>
  new Promise(async (resolve) => {
    console.log(userId,'...............................');
      const total = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: {
              user: ObjectID(userId),
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.prize"] } },
            },  
          }
        ])
        .toArray();
      resolve(total);
    }),
  placeOrder: (order, products, total) =>
    new Promise((resolve) => {
      const status = order["payment-method"] === "COD" ? "placed" : "Placed";
      const orderObj = {
        deliveryDetails: {
          name: order.name,
          mobile: order.Mobile,
          address: order.address,
          pincode: order.pincode,
        },
        userId: ObjectID(order.user),
        paymentMethod: order["payment-method"],
        products: products.products,
        total: total[0].total,
        status: status,
        date: moment().format("DD/MM/YYYY"),
      };
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collections.CART_COLLECTION)
            .removeOne({ user: ObjectID(order.user) });
          resolve(response.ops[0]._id);
        });
    }),
  getCartProductList: (userId) =>
    new Promise(async (resolve) => {
      const cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: ObjectID(userId) });
      resolve(cart);
    }),
  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find({ userId: ObjectID(userId) })
        .toArray();
      resolve(orders);
    });
  },
  getUserOrders4Admin: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find()
        .toArray();
      resolve(orders);
    });
  },
  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: ObjectID(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(orderItems);
    });
  },
  menOnly: () => {
    return new Promise(async (resolve) => {
      const products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ category: "Mens" })
        .toArray();
      resolve(products);
    });
  },
  womenOnly: () => {
    return new Promise(async (resolve) => {
      const products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ category: "Ladies" })
        .toArray();
      resolve(products);
    });
  },
  kidsOnly: () => {
    return new Promise(async (resolve) => {
      const products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ category: "Kids Watches" })
        .toArray();
      resolve(products);
    });
  },
  UOnly: () => {
    return new Promise(async (resolve) => {
      const products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ category: "Unisex" })
        .toArray();
      resolve(products);
    });
  },
  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: total * 100,
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        if (err) console.log(err);
        else resolve(order);
      });
    });
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject)  => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "xXiH38Uft4i4IXnfiJZhWiiG");

      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },
  changeOrderStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectID(orderId) },
          {
            $set: {
              Paymentstatus: "Success",
            },
          }
        )
        .then(() => {
          resolve();
        })
        .catch(() => {
          reject();
        });
    });
  },
  generatePaypal: (total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: total,
      };
      resolve(options);
    });
  },
  saveAddress: (body) => {
    return new Promise(async () => {
      address = {
        name: body.name,
        address: body.address,
        pincode: body.pincode,
        mobile: body.Mobile,
        user: body.user,
      };
      await db
        .get()
        .collection(collections.ADDRESS_COLLECTION)
        .insertOne(address)
        .then(() => {});
    });
  },
  getAddress: (id) => {
    return new Promise(async (resolve, reject) => {
      let address = await db
        .get()
        .collection(collections.ADDRESS_COLLECTION)
        .findOne({ user: id });
      resolve({ address });
    });
  },
  getOnePro: (id) => {
    return new Promise(async (resolve) => {
      var element = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .findOne({ _id: ObjectID(id) });
      var time = moment().format("DD/MM/YYYY");
      if (element.dat) {
        if (
          element.dat.offerEndDate >= time &&
          element.dat.offerStartDate <= time
        ) {
          var oPrize = element.prize;
          var off = 100 - element.dat.off;
          element.prize = ((oPrize / 100) * off).toFixed(0);
          element.rp = oPrize;
        }
      }
      resolve(element);
    });
  },
  filter: (name) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ category: name })
        .toArray()
        .then((data) => {
          resolve(data);
        });
    });
  },
  cancel: (id) => {
    return new Promise((resolve) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) },
          {
            $set: {
              status: "Cancelled",
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },
  getUserProfile: (userId) => {
    return new Promise(async (resolve) => {
      var data = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .find({ _id: ObjectID(userId) })
        .toArray();
      resolve(data[0]);
    });
  },
  updateAddress: (body) => {
    return new Promise(async (resolve) => {
      var userId = body.user;
      address = {
        name: body.name,
        address: body.address,
        pincode: body.pincode,
        mobile: body.Mobile,
      };
      await db
        .get()
        .collection(collections.ADDRESS_COLLECTION)
        .updateOne({ user: userId }, { $set: address })
        .then(() => {
          resolve();
        });
    });
  },
  updateProfile: (user) => {
    return new Promise((resolve) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { _id: ObjectID(user.user) },
          {
            $set: {
              name: user.name,
              mobile: user.mobile,
            },
          }
        );
      resolve();
    });
  },
  storeMessage:(data)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collections.USER_MESSAGES).insertOne(data).then(()=>{
        resolve()
      })
    })
  }
};
