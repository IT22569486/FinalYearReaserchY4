// models/userService.js
const { db } = require("../firebase"); // Firestore instance
const bcrypt = require("bcrypt");
const usersCollection = db.collection("users");

// Add new user
async function createUser(userData) {
  const existingUserSnap = await usersCollection
    .where("email", "==", userData.email)
    .get();

  if (!existingUserSnap.empty) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const newUser = {
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    role: userData.role || "user",
    createdAt: new Date(),
  };

  const docRef = await usersCollection.add(newUser);
  const { password, ...userWithoutPassword } = newUser; // Don't return the hashed password
  return { id: docRef.id, ...userWithoutPassword };
}

// Get user by ID
async function getUserById(userId) {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  const { password, ...userWithoutPassword } = doc.data();
  return { id: doc.id, ...userWithoutPassword };
}

// Get all users
async function getAllUsers() {
  const snapshot = await db.collection("users").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Update user
async function updateUser(userId, updatedData) {
  await db.collection("users").doc(userId).update(updatedData);
  return getUserById(userId);
}

// Delete user
async function deleteUser(userId) {
  await db.collection("users").doc(userId).delete();
  return { success: true };
}

// Find user by email
async function findUserByEmail(email) {
  const snapshot = await usersCollection.where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

// Find user by ID
async function findUserById(id) {
  const doc = await usersCollection.doc(id).get();
  if (!doc.exists) return null;
  const { password, ...userWithoutPassword } = doc.data();
  return { id: doc.id, ...userWithoutPassword };
}

module.exports = {
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  findUserByEmail,
  findUserById,
};
