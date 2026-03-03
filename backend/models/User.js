/**
 * User Model
 * Represents a user in the system (passenger, driver, admin, etc.)
 */

class User {
  constructor(data) {
    this.bloodGroup = data.bloodGroup || '';
    this.createdAt = data.createdAt || new Date();
    this.dob = data.dob || '';
    this.email = data.email || '';
    this.mobileNo = data.mobileNo || '';
    this.name = data.name || '';
    this.nic = data.nic || '';
    this.password = data.password || '';
    this.role = data.role || 'passenger';
  }

  toFirestore() {
    return {
      bloodGroup: this.bloodGroup,
      createdAt: this.createdAt,
      dob: this.dob,
      email: this.email,
      mobileNo: this.mobileNo,
      name: this.name,
      nic: this.nic,
      password: this.password,
      role: this.role
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new User({
      id: doc.id,
      ...data
    });
  }
}

module.exports = User;
