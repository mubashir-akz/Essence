const { log } = require("debug");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const productHelpers = require("../helpers/product-helpers");
const adminHelpers = require("../helpers/admin-helpers");
const userHelpers = require("../helpers/user-helpers");
const moment = require("moment");

var base64ToImage = require("base64-to-image");
const { response } = require("express");
const router = express.Router();
const app = express();
app.use(
  session({
    name: "admin",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ url: "mongodb://localhost:27017/shopping" }),
    secret: "secret",
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 10,
    },
  })
);
/* GET users listing. */

router.get("/", (req, res) => {
  const data = req.session.admin;
  if (req.session.admin) {
    res.redirect("/admin/dashboard");
  }
  res.render("admin/signin", { logErr: req.session.logErr });
  req.session.logErr = false;
});
router.post("/", (req, res, _next) => {
  adminHelpers.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.adminLoggedIn = true;
      req.session.admin = response.user;
      res.redirect("/admin/dashboard");
    } else {
      req.session.logErr = true;
      res.redirect("/admin");
    }
  });
});
function verify(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/admin");
  }
}
router.get("/dashboard", verify, async (req, res) => {
  var totalOrders = await adminHelpers.totalOrders();
  var totalRev = await adminHelpers.totalRev();
  var totalPro = await adminHelpers.totalPro();
  var totalCat = await adminHelpers.totalCat();

  res.render("admin/dashboard", {
    admin: true,
    data: req.session.admin.name,
    totalOrders,
    totalRev,
    totalPro,
    totalCat,
    title:'dashboard'
  });
});
router.get("/all-product", verify, (req, res) => {
  productHelpers.getAllProduct().then((products) => {
    res.render("admin/home", {
      admin: true,
      products,
      data: req.session.admin.name,
      title:'Products'
    });
  });
});
router.get("/add-product", verify, async (req, res) => {
  var categories = await productHelpers.getCat();
  res.render("admin/add-product", {
    admin: true,
    categories,
    data: req.session.admin.name,
    title:'add-product'
  });
});
router.post("/add-product", (req, res) => {
  pro = req.body.image64data;
  req.body.image64data = "";
  productHelpers.addproducts(req.body, (id) => {
    var base64Str = pro;
    var path = "./public/product-images/";
    var optionalObj = { fileName: id, type: "jpg" };

    var imageInfo = base64ToImage(base64Str, path, optionalObj);
    pro = imageInfo;
    res.redirect("/admin/dashboard");
  });
});
router.get("/signout", (req, res) => {
  req.session.admin = null;
  res.redirect("/admin");
});
router.get("/delete-product", verify, (req, res) => {
  const { id } = req.query;
  productHelpers.deleteProducts(id).then(() => {
    res.redirect("/admin");
  });
});
router.get("/edit-products", verify, async (req, res) => {
  const product = await productHelpers.getProductDetails(req.query.id);
  res.render("admin/edit-products", {
    admin: true,
    product,
    data: req.session.admin.name,
    title:'Edit products'
  });
});
router.post("/edit-products/:id", (req, res, _next) => {
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin/all-product");
    if (req.files.image) {
      const { image } = req.files;
      image.mv(`./public/product-images/${req.params.id}.jpg`);
    }
  });
}),
  router.get("/users", verify, async (req, res, _next) => {
    const users = await adminHelpers.getAllUsers();
    res.render("admin/users", {
      admin: true,
      data: req.session.admin.name,
      users,
      userExist: req.session.userExist,
      title:'Users'
    });
  });
router.get("/signupadmin", verify, (req, res) => {
  res.render("admin/signupadmin", {
    admin: true,
    data: req.session.admin.name,
    userExist: req.session.userExist,
  });
  req.session.userExist = false;
});
router.post("/signupadmin", verify, (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    if (response.status == "error") {
      req.session.userExist = true;
      res.redirect("/admin/signupadmin");
    } else res.redirect("/admin/users");
  });
});

router.get("/deleteUser", verify, (req, res) => {
  const { id } = req.query;
  adminHelpers.deleteUser(id).then((_response) => {
    res.redirect("/admin/users");
  });
});
router.get("/orders", verify, async (req, res) => {
  let orders = await userHelpers.getUserOrders4Admin();
  res.render("admin/orders", {
    admin: true,
    orders,
    data: req.session.admin.name,
    title:'Orders'
  });
});
router.get("/view-order-products4Admin/:id", verify, async (req, res) => {
  await userHelpers.getOrderProducts(req.params.id).then((products) => {
    res.render("admin/ordered-products", {
      admin: true,
      products,
      data: req.session.admin.name,
      title:'Ordered products'
    });
  });
});
router.post("/changeProductStatus", async (req, res) => {
  await adminHelpers.changeProductStatus(req.body).then((data) => {
    res.json({ status: true });
  });
});
router.get("/addCategory", (req, res) => {
  res.render("admin/addCategory", {
    admin: true,
    data: req.session.admin.name,
    title: 'Add Category'
  });
});
router.post("/add-category", async (req, res) => {
  const category = req.body.category;
  await productHelpers.addCategory(category).then((data) => {
    res.redirect("/admin/dashboard");
  });
});
router.get("/report", verify, (req, res) => {
  res.render("admin/report", { admin: true, data: req.session.admin.name,title:'Report'});
});
router.post("/filter", async (req, res) => {
  data = req.body.data;
  if (data != "custom") {
    if (data == "today") {
      var date = moment().format("DD/MM/YYYY");
      await adminHelpers.getFilter(date).then((response) => {
        res.json(response);
      });
    } else if (data == "yesterday") {
      var date = moment().subtract(1, "days").format("DD/MM/YYYY");
      await adminHelpers.getFilter(date).then((response) => {
        res.json(response);
      });
    } else if (data == "lastWeek") {
      var date = moment().format("DD/MM/YYYY");
      await adminHelpers.getFilterByWeek(date).then((response) => {
        res.json(response);
      });
    } else if (data == "lastMonth") {
      var date = moment().format("DD/MM/YYYY");
      await adminHelpers.getFilterByMonth(date).then((response) => {
        res.json(response);
      });
    }
  }
}),
  router.post("/custom", async (req, res) => {
    var to = req.body.toDate;
    var from = req.body.fromDate;
    await adminHelpers.getFilterByCustom(to, from).then((data) => {
      res.json(data);
    });
  });
router.get("/category", async (req, res) => {
  cat = await adminHelpers.getAllCat();
  res.render("admin/category", { admin: true, cat , title:'Category'});
});
router.get("/deleteCat/:id/:name", async (req, res) => {
  await adminHelpers.deleteCat(req.params.id);
  await adminHelpers.deleteCatPro(req.params.name).then((data)=>{
  })
  res.redirect('/admin/category')
});
router.get("/offer", async (req, res) => {
  var offers = await adminHelpers.getOffer();
  
  res.render("admin/offer", { admin: true, offers,title:'Offer'});
});
router.get("/addOffer", async (req, res) => {
  var pro = await productHelpers.getAllProduct();
  var categories = await productHelpers.getCat();
  res.render("admin/addOffer", { admin: true, categories, pro,title:'Add Offer' });
});
router.post("/add-offer", async (req, res) => {
  var d = req.body.endDate;
  var s = req.body.startDate;
  var data = {
    offName: req.body.name,
    off: parseInt(req.body.prize),
    offerType: req.body.offer[0],
    offerStartDate: moment(s).format("DD/MM/YYYY"),
    offerEndDate: moment(d).format("DD/MM/YYYY"),
    pro: req.body.offer[1],
  };
  adminHelpers.addOffer(data);
  if (req.body.offer[0] == "products") {
    adminHelpers.productOff(data);
    res.redirect("/admin/offer");
  } else {
    adminHelpers.catOff(data);
    res.redirect("/admin/offer");
  }
});
router.get('/feedback',async(req,res)=>{
  data = await adminHelpers.getMessages()
    res.render('admin/feedback',{admin:true,msg:data,title:'Feedback'})
})  
module.exports = router;
