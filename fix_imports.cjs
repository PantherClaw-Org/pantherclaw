const fs = require('fs');

function prepend(file, line) {
  const content = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, line + '\n' + content);
}

prepend('src/App.jsx', 'import React, { useEffect, Suspense, lazy } from "react";');
prepend('src/components/AuthModal.jsx', 'import React, { useState } from "react";');
prepend('src/components/CartDrawer.jsx', 'import React, { useEffect, useRef } from "react";\nimport { AnimatePresence, motion } from "framer-motion";');

let checkoutSuccess = fs.readFileSync('src/pages/CheckoutSuccess.jsx', 'utf8');
checkoutSuccess = checkoutSuccess.replace('setOrderNum(order.order_number);', '');
fs.writeFileSync('src/pages/CheckoutSuccess.jsx', checkoutSuccess);

console.log("Fixed missing imports and variables");
