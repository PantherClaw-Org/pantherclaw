const fs = require('fs');
const path = require('path');

function replaceFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (let [search, replace] of replacements) {
    if (search instanceof RegExp) {
      content = content.replace(search, replace);
    } else {
      content = content.split(search).join(replace);
    }
  }
  fs.writeFileSync(filePath, content);
}

replaceFile('src/App.jsx', [
  [/import React.*from "react";\n/, ''],
  [/import { .*useLocation.* } from 'react-router-dom';/, "import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';"],
  [/import AuthModal from '.\/components\/AuthModal';\n/, '']
]);

replaceFile('src/components/AuthModal.jsx', [
  [/import React.*from "react";\n/, '']
]);

replaceFile('src/components/CartDrawer.jsx', [
  [/import React.*from "react";\n/, ''],
  [/import { motion, AnimatePresence } from "framer-motion";\n/, ''],
  [/import { X, Minus, Plus, ShoppingBag } from "lucide-react";/, 'import { X, Minus, Plus } from "lucide-react";']
]);

replaceFile('src/components/Footer.jsx', [
  [/import React from "react";\n/, '']
]);

replaceFile('src/components/LoadingScreen.jsx', [
  [/import React from "react";\n/, '']
]);

replaceFile('src/components/Marquee.jsx', [
  [/import React from "react";\n/, '']
]);

replaceFile('src/components/Navbar.jsx', [
  [/import React, { useState, useEffect } from "react";/, 'import { useState, useEffect } from "react";']
]);

replaceFile('src/components/ProductCard.jsx', [
  [/import React from "react";\n/, ''],
  ['({ product, index })', '({ product })']
]);

replaceFile('src/context/AuthContext.jsx', [
  [/import React, { createContext, useContext, useState, useEffect } from "react";/, 'import { createContext, useContext, useState, useEffect } from "react";']
]);

replaceFile('src/pages/Checkout.jsx', [
  [/import React, { useState, useEffect } from "react";/, 'import { useState, useEffect } from "react";'],
  ['const { items, subtotal, clear, session_id }', 'const { items, subtotal, session_id }']
]);

replaceFile('src/pages/CheckoutSuccess.jsx', [
  [/import React, { useEffect, useState } from "react";/, 'import { useEffect, useState } from "react";'],
  ['const [orderNum, setOrderNum] = useState(null);\n', '']
]);

replaceFile('src/pages/ProductDetail.jsx', [
  [/import React, { useState } from "react";/, 'import { useState } from "react";'],
  ['const isOutOfStock = selectedVariant ? selectedVariant.inventory_count <= 0 : true;\n', '']
]);

console.log('Fixed imports');
