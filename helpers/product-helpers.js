var db = require("../config/connection");
var collections = require("../config/collections");
const { ObjectID } = require("mongodb");
const object = require("mongodb").ObjectID;
const moment = require("moment");

module.exports = {
  addproducts: (product, callback) => {
    product.prize = parseInt(product.prize);
    db.get()
      .collection(collections.PRODUCT_COLLECTION)
      .insertOne(product)
      .then((data) => {
        callback(data.ops[0]._id);
      });
  },
  getAllProduct: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTION)
        .find()
        .toArray();
      var time = moment().format("DD/MM/YYYY");
      products.forEach((element) => {
        if (element.endDate && element.startDate) {
          if (element.startDate <= time) {
            if (element.endDate >= time) {
            } else {
              element.prize = element.mrp;
              element.mrp = undefined;
              element.endDate = undefined;
              element.off = undefined;
              db.get()
                .collection(collections.PRODUCT_COLLECTION)
                .updateOne({ _id: ObjectID(element._id) }, { $set: element })
                .then(() => {
                });
            }
          }
        }
      });
      resolve(products);
    });
  },
  deleteProducts: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .deleteOne({ _id: object(proId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  getProductDetails: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .findOne({ _id: ObjectID(proId) })
        .then((product) => {
          resolve(product);
        });
    });
  },
  updateProduct: (proId, proDetails) => {
    var price = parseInt(proDetails.prize);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTION)
        .updateOne(
          { _id: ObjectID(proId) },
          {
            $set: {
              name: proDetails.name,
              description: proDetails.description,
              prize: price,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },
  addCategory: (data) => {
    return new Promise(async (resolve, reject) => {
      var d = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .insertOne({ category: data });
      resolve();
    });
  },
  getCat: () => {
    return new Promise(async (resolve, reject) => {
      var cat = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .find()
        .toArray();
      resolve(cat);
    });
  },
};
