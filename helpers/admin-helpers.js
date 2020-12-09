const db = require("../config/connection");
const collections = require("../config/collections");
const { ObjectId } = require("mongodb");
const object = require("mongodb").ObjectID;
const moment = require("moment");

module.exports = {
  doAdminLogin: (userdata) =>
    new Promise(async (resolve) => {
      const response = {};
      const user = await db
        .get()
        .collection(collections.ADMIN_COLLECTION)
        .findOne({ email: userdata.email });
      if (user) {
        if (userdata.password == user.password) {
          response.user = user;
          response.status = true;
          resolve(response);
        } else {
          resolve({ status: false });
        }
      } else {
        resolve({ status: false });
      }
    }),
  getAllUsers: () =>
    new Promise(async (resolve, reject) => {
      const user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .find({})
        .toArray();
      resolve(user);
    }),
  deleteUser: (userId) =>
    new Promise((resolve, reject) => {
      // db.get().collection(collections.USER_COLLECTION).deleteOne({ _id: object(userId) }).then((response) => {
      //   resolve(response);
      // });
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId) },
          {
            $set: {
              userStatus: "Blocked",
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    }),
  changeProductStatus: (data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(data.user) },
          {
            $set: {
              status: data.status,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },
  totalOrders: () => {
    return new Promise(async (resolve, reject) => {
      let count = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .countDocuments();
      resolve(count);
    });
  },
  totalRev: () => {
    return new Promise(async (resolve) => {
      let total = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .aggregate([
          {
            $project: {
              prize: "$total",
            },
          },
        ])
        .toArray();
      var len = total.length;
      var totall = 0;
      for (i = 0; i < len; i++) {
        totall = totall + total[i].prize;
      }
      resolve(totall);
    });
  },
  totalPro: () => {
    return new Promise(async (resolve, reject) => {
      let count = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .countDocuments();
      resolve(count);
    });
  },
  totalCat: () => {
    return new Promise(async (resolve) => {
      let total = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .countDocuments();
      resolve(total);
    });
  },
  getFilter: (date) => {
    return new Promise(async (resolve, reject) => {
      var data = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find({ date: date })
        .toArray();
      resolve(data);
    });
  },
  getFilterByWeek: (date) => {
    return new Promise(async (resolve, reject) => {
      datas = [];
      for (var i = 0; i < 7; i++) {
        let date = moment().subtract(i, "days").format("DD/MM/YYYY");
        //  let b =  await db.get().collection(collections.ORDER_COLLECTION).find({date:date})
        let b = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .find({ date: date })
          .toArray();
        if (b.length > 0) {
          for (var j = 0; j < b.length; j++) {
            datas.push(b[j]);
          }
        }
      }
      resolve(datas);
    });
  },
  getFilterByMonth: (date) => {
    return new Promise(async (resolve, reject) => {
      datas = [];
      for (var i = 0; i < 30; i++) {
        let date = moment().subtract(i, "days").format("DD/MM/YYYY");
        //  let b =  await db.get().collection(collections.ORDER_COLLECTION).find({date:date})
        let b = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .find({ date: date })
          .toArray();
        if (b.length > 0) {
          for (var j = 0; j < b.length; j++) {
            datas.push(b[j]);
          }
        }
      }
      resolve(datas);
    });
  },
  getFilterByCustom: (to, from) => {
    return new Promise(async (resolve, reject) => {
      datas = [];
      let tot = moment(to).format("DD/MM/YYYY");
      let from2 = moment(from).format("DD/MM/YYYY");
      var diffDays = tot - from2;
      await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find({ date: { $gte: from2, $lte: tot } })
        .toArray()
        .then((data) => {
          resolve(data);
        });
    });
  },
  getAllCat: () => {
    return new Promise((resolve) => {
      db.get()
        .collection(collections.CATEGORY_COLLECTION)
        .find()
        .toArray()
        .then((data) => {
          resolve(data);
        });
    });
  },
  deleteCat: (id) => {
    return new Promise(async (resolve) => {
      await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .deleteOne({ _id: ObjectId(id) })
        .then((data) => {
          resolve();
        });
    });
  },
  deleteCatPro: (name) => {
    return new Promise(async (resolve) => {
      await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .removeMany({ category: name });
    }).then((data) => {
      resolve(data);
    });
  },
  addOffer: (data) => {
    return new Promise(async (resolve) => {
      await db
        .get()
        .collection(collections.OFFER_COLLECTION)
        .insertOne(data)
        .then((data) => {
          resolve();
        });
    });
  },
  getOffer: () => {
    return new Promise(async (resolve) => {
      db.get()
        .collection(collections.OFFER_COLLECTION)
        .find()
        .toArray()
        .then((data) => {
          resolve(data);
        });
    });
  },
  productOff: (dat) => {
    return new Promise((resolve) => {
      var id = dat.pro;
      // var off = dat.off;
      // var offDate = dat.offDate;
      // db.get()
      //   .collection(collections.PRODUCT_COLLECTION)
      //   .updateOne({ _id: ObjectId(id) }, { $set: { dat } })
      //   .then(() => {
      //     resolve();
      //   });
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ _id: ObjectId(id) })
        .toArray()
        .then((data) => {
          data.forEach((element) => {
            var off = 100 - dat.off;
            var p = element.prize;
            element.endDate = dat.offerEndDate;
            element.startDate = dat.offerStartDate;
            element.off = dat.off;
            element.mrp = element.prize;
            element.prize = parseInt(((p / 100) * off).toFixed(0));

            db.get()
              .collection(collections.PRODUCT_COLLECTION)
              .updateOne({ _id: ObjectId(id) }, { $set: element });
          });
        });
    });
  },
  catOff: (dat) => {
    return new Promise((resolve) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .find({ category: dat.pro })
        .toArray()
        .then((data) => {
          data.forEach((element) => {
            var off = 100 - dat.off;
            var p = element.prize;
            element.endDate = dat.offerEndDate;
            element.startDate = dat.offerStartDate;
            element.off = dat.off;
            element.mrp = element.prize;
            element.prize = parseInt(((p / 100) * off).toFixed(0));

            db.get()
              .collection(collections.PRODUCT_COLLECTION)
              .updateOne({ _id: ObjectId(element._id) }, { $set: element });
          });
        });
    });
  },
  getMessages: () => {
    return new Promise( (resolve) => {
      db.get()
        .collection(collections.USER_MESSAGES)
        .find()
        .toArray()
        .then((data) => {
          resolve(data);
        });
    });
  },
};
