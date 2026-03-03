/**
 * BusTripRecord Model
 * Represents detailed records of bus trip segments for analytics
 */

class BusTripRecord {
  constructor(data) {
    this.Alighting = data.Alighting || 0;
    this.Boarding = data.Boarding || 0;
    this.Destination = data.Destination || '';
    this.Distance_km = data.Distance_km || 0;
    this.Origin = data.Origin || '';
    this.Route = data.Route || '';
    this.Stamp = data.Stamp || '';
    this.Trip_ID = data.Trip_ID || '';
    this.Trip_Start_Time = data.Trip_Start_Time || '';
    this.busID = data.busID || '';
    this.createdAt = data.createdAt || new Date();
    this.day_type = data.day_type || 'weekday';
    this.holiday_type = data.holiday_type || 'none';
    this.routeId = data.routeId || '';
  }

  toFirestore() {
    return {
      Alighting: this.Alighting,
      Boarding: this.Boarding,
      Destination: this.Destination,
      Distance_km: this.Distance_km,
      Origin: this.Origin,
      Route: this.Route,
      Stamp: this.Stamp,
      Trip_ID: this.Trip_ID,
      Trip_Start_Time: this.Trip_Start_Time,
      busID: this.busID,
      createdAt: this.createdAt,
      day_type: this.day_type,
      holiday_type: this.holiday_type,
      routeId: this.routeId
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new BusTripRecord({
      id: doc.id,
      ...data
    });
  }
}

module.exports = BusTripRecord;
