const express = require("express");
const noty = require("noty"); //noty
const router = express.Router();
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const app = express();
const moment = require("moment");
var request = require("request");
const cors = require("cors");
const Noty = require("noty");
const cogoToast = require("cogo-toast");
app.use(cors());
var CLIENT =
  "AUJoKVGO3q1WA1tGgAKRdY6qx0qQNIQ6vl6D3k7y64T4qh5WozIQ7V3dl3iusw5BwXYg_T5FzLCRguP8";
var SECRET =
  "EOw8LNwDhM7esrQ3nHfzKc7xiWnJc83Eawln4YLfUgivfx1LGzu9Mj0F5wlarilXDqdK9Q5aHVo-VGjJ";
var PAYPAL_API = "https://api-m.sandbox.paypal.com";
router.use(
  session({
    name: "rfddrhvf",
    resave: false,
    store: new MongoStore({ url: "mongodb://localhost:27017/shopping" }),
    saveUninitialized: false,
    secret: "secret",
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const verifyLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/signin");
  }
};

/* GET home page. */
router.get("/", async (req, res) => {
  const { user } = req.session;
  var categories = await productHelpers.getCat();

  let cartcount = 0;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  productHelpers.getAllProduct().then((products) => {
    console.log(req.session.user);
    if (req.session.user == null) {
      res.render("user/index", {
        user: true,
        products,
        use: req.session.user,
        cartcount,
        categories,
        title: "Essence",
      });
    } else {
      res.render("user/index", {
        user: true,
        products,
        cart:req.session,
        use: req.session.user,
        cartcount,
        categories,
        title: "Essence",
      });
    }
  });
});
router.get("/signin", async (req, res) => {
  const { user } = req.session;

  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    var categories = await productHelpers.getCat();
    let cartcount = null;
    if (user) {
      cartcount = await userHelpers.getCartCount(req.session.user._id);
    }
    res.render("user/signin", {
      cartcount,
      categories,
      logErr: req.session.logErr,
      user: true,
      title: "SignIn",
    });
    req.session.logErr = false;
  }
});
router.get("/signup", async (req, res) => {
  const { user } = req.session;

  var categories = await productHelpers.getCat();
  let cartcount = null;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  res.render("user/signup", {
    cartcount,
    categories,
    signErr: req.session.userExist,
    user: true,
    title: "SignUp",
  });
  req.session.userExist = false;
});
router.post("/signup", (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    if (response.status === "error") {
      req.session.userExist = true;
      res.redirect("/signup");
    } else res.redirect("/signin");
  });
});
router.post("/signin", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.userloggedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      req.session.logErr = true;
      res.redirect("/signin");
    }
  });
});

router.get("/signout", (req, res) => {
  req.session.user = null;
  res.redirect("/");
});
router.get("/cart", verifyLogin, async (req, res) => {
  const { user } = req.session;

  // eslint-disable-next-line no-underscore-dangle
  const total = await userHelpers.getTotalAmount(req.session.user._id);
  console.log(req.session.user);
  const products = await userHelpers.getCartProducts(req.session.user._id);
  var time = moment().format("DD/MM/YYYY");
  products.forEach((element) => {
    if (element.products.dat) {
      if (
        element.products.dat.offerEndDate >= time &&
        element.products.dat.offerStartDate <= time
      ) {
        var oPrize = element.products.prize;
        var off = 100 - element.products.dat.off;
        element.products.prize = ((oPrize / 100) * off).toFixed(0);
        element.rp = oPrize;
      }
    }
  });
  var categories = await productHelpers.getCat();
  let cartcount = null;

  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  if ((total.length > 0) & (products.length > 0)) {
    res.render("user/cart", {
      products,
      cartcount,
      user: true,
      categories,
      users: req.session.user,
      total: total[0].total,
      title: "Cart",
    });
  } else {
    res.render("user/cart", {
      cartcount,
      categories,
      users: req.session._id,
      user: true,
      title: "Cart",
    });
  }
});
router.post("/add-to-cart", verifyLogin, async (req, res) => {
  const { user } = req.session;
  let cartcount = 0;
  if (req.session.user) {
    userHelpers
      .addToCart(req.body.user, req.session.user._id)
      .then(async () => {
        if (user) {
          cartcount = await userHelpers.getCartCount(req.session.user._id);
        }
        res.json({ status: true, cartcount });
      });
  } else {
    res.json({ status: false });
  }
});

router.get("/contactus", verifyLogin, async (req, res) => {
  const { user } = req.session;

  var categories = await productHelpers.getCat();
  let cartcount = null;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  res.render("user/contactus", {
    cartcount,
    categories,
    user: true,
    users: req.session.user,
    title: "Contact Us",
  });
});

router.post("/change-product-quantity", verifyLogin, (req, res) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.session.user._id);
    res.json(response.total[0].total);
  });
});

router.post("/deleteCartProduct", verifyLogin, (req, res) => {
  userHelpers.deleteFromCart(req.body).then(() => {
    res.json({ status: true });
  });
});
router.get("/checkout", verifyLogin, async (req, res) => {
  const { user } = req.session;

  const total = await userHelpers.getTotalAmount(req.session.user._id);
  const products = await userHelpers.getCartProducts(req.session.user._id);
  const address = await userHelpers.getAddress(req.session.user._id);

  const jfd = products.length;
  var categories = await productHelpers.getCat();
  let cartcount = null;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  if (address.address == null) {
    res.render("user/checkout", {
      categories,
      cartcount,
      total: total[0].total,
      products,
      jfd,
      userId: req.session.user._id,
      user: true,
      users: req.session.user,
      title: "Checkout",
    });
  } else {
    res.render("user/checkout", {
      address,
      categories,
      cartcount,
      total: total[0].total,
      products,
      jfd,
      userId: req.session.user._id,
      user: true,
      users: req.session.user,
      title: "Checkout",
    });
  }
});
router.post("/address", verifyLogin, async (req, res) => {
  if (req.body["address save"]) {
    const addresSave = userHelpers.saveAddress(req.body);
  }

  const products = await userHelpers.getCartProductList(req.body.user);
  const totalPrice = await userHelpers.getTotalAmount(req.body.user);

  userHelpers
    .placeOrder(req.body, products, totalPrice)
    .then(async (orderId) => {
      if (req.body["payment-method"] == "COD") {
        res.json({ COD: true });
      } else if (req.body["payment-method"] == "Razorpay") {
        userHelpers
          .generateRazorpay(orderId, totalPrice[0].total)
          .then((response) => {
            res.json({ razorpay: true, response });
          });
      } else {
        userHelpers.generatePaypal(totalPrice[0].total).then((response) => {
          res.json({ paypal: true, response });
        });
      }
    });
});
router.get("/orderPlaced", verifyLogin, async (req, res) => {
  const { user } = req.session;

  var categories = await productHelpers.getCat();
  let cartcount = null;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  res.render("user/orderPlaced", {
    categories,
    cartcount,
    user: true,
    users: req.session.user,
    title: "Order Placed",
  });
});

router.get("/orders", verifyLogin, async (req, res) => {
  const { user } = req.session;

  let orders = await userHelpers.getUserOrders(req.session.user._id);
  var categories = await productHelpers.getCat();
  let cartcount = 0;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  res.render("user/orders", {
    cartcount,
    categories,
    orders,
    user: true,
    users: req.session.user,
    title: "Orders",
  });
});

router.get("/abcd/:id", async (req, res) => {
  const { user } = req.session;

  let products = await userHelpers.getOrderProducts(req.params.user._id);
  // let quantity = products[0].quantity;
  // let product = products[0].product;
  var categories = await productHelpers.getCat();
  let cartcount = null;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  res.render("user/ordered-products", {
    categories,
    cartcount,
    user: true,
    products,
    users: req.session.user,
    title: "Ordered Products",
  });
});
router.post("/verifyPayment", async (req, res) => {
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers
      .changeOrderStatus(req.body["order[receipt]"])
      .then(() => {
        res.json({ status: true });
      })
      .catch(() => {
        res.json({ status: false });
      });
  });
});
router.get("/view-product/:id", async (req, res) => {
  const { user } = req.session;

  const id = req.params.id;
  const product = await userHelpers.getOnePro(id);
  var categories = await productHelpers.getCat();
  let cartcount = 0;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  var prize = parseInt(product.prize);
  res.render("user/product-view", {
    categories,
    cartcount,
    user: true,
    name: product.name,
    users: req.session.user,
    id: product._id,
    description: product.description,
    prize,
    title: "Product - view",
  });
});
router.get("/filter/:name", async (req, res) => {
  const { user } = req.session;

  var categories = await productHelpers.getCat();
  let cartcount = null;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  userHelpers.filter(req.params.name).then((data) => {
    res.render("user/Category", {
      categories,
      cartcount,
      data,
      user: true,
      users: req.session.user,
      name: req.params.name,
      title: req.params.name,
    });
  });
});
router.get("/cancel/:id", (req, res) => {
  userHelpers.cancel(req.params.id).then((response) => {
    res.redirect("/orders");
  });
});
router.get("/userProfile", async (req, res) => {
  var users = await userHelpers.getUserProfile(req.session.user._id);
  const address = await userHelpers.getAddress(req.session.user._id);
  var categories = await productHelpers.getCat();
  let cartcount = null;
  const { user } = req.session;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  res.render("user/userProfile", {
    categories,
    cartcount,
    user: true,
    users: req.session.user,
    use: users,
    ad: address.address,
    title: "Profile",
  });
});
router.get("/editAddress", async (req, res) => {
  var categories = await productHelpers.getCat();
  let cartcount = null;
  const { user } = req.session;
  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }

  const address = await userHelpers.getAddress(req.session.user._id);
  res.render("user/addresEdit", {
    user: true,
    address: address.address,
    users: req.session.user,
    cartcount,
    categories,
    title: "Edit profile",
  });
});
router.post("/updateAddress", async (req, res) => {
  await userHelpers.updateAddress(req.body);
  res.redirect("/userProfile");
});
router.get("/profileEdit", async (req, res) => {
  var categories = await productHelpers.getCat();
  let cartcount = null;
  const { user } = req.session;

  if (user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id);
  }
  var users = await userHelpers.getUserProfile(req.session.user._id);
  res.render("user/editProfile", {
    user: true,
    use: users,
    categories,
    cartcount,
    title: "Profile Edit",
  });
});
router.post("/updateProfile", async (req, res) => {
  var id = req.body.user;
  await userHelpers.updateProfile(req.body);
  let image = req.files.image;
  image.mv("./public/user-images/" + id + ".jpg", (err, done) => {
    if (err) console.log(err);
    else {
      res.redirect("/userProfile");
    }
  });
});
router.post("/messages", (req, res) => {
  userHelpers.storeMessage(req.body).then(() => {
    res.redirect("/");
  });
});

module.exports = router;
