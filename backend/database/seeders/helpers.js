async function seedCollection(db, collectionName, documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return 0;
  }

  const batch = db.batch();
  const collectionRef = db.collection(collectionName);

  documents.forEach((doc) => {
    const ref = collectionRef.doc();
    batch.set(ref, doc);
  });

  await batch.commit();
  return documents.length;
}

module.exports = {
  seedCollection
};
