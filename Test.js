var x = require('./mailbox-db');

//x.initDatabase();
/*
x.insertNewKey('hallo');
x.insertNewKey('welt');
x.insertNewKey('test');
x.insertNewDevice('Client', 'test', 1);
x.insertNewDevice('VA', 'testVA', 1);
x.insertNewDevice('test', 'test', 1);
x.insertNewDevice('test2', 'test', 2);

x.deleteDeviceByID(2);
x.deleteDeviceByName('test2');
x.deleteKeyByID(3);
x.deleteKeyByCodeword('test');

x.selectAllDevices(function(rows) {
console.log(rows.length);
for(var i = 0; i < rows.length; i++) {
console.log(rows[i]);
}
});
x.selectDeviceByID(1, function(rows) {
console.log(rows.id);
console.log(rows.name);
console.log(rows.ip_address);
console.log(rows.key_id);
});
x.selectDeviceByName('VA', function(rows) {
console.log(rows.id);
console.log(rows.name);
console.log(rows.ip_address);
console.log(rows.key_id);
});
x.selectDeviceByKeyID(1, function(rows) {
for(var i = 0; i < rows.length; i++) {
console.log(rows[i]);
}
});
x.selectAllKeys(function(rows) {
console.log(rows.length);
for(var i = 0; i < rows.length; i++) {
console.log(rows[i]);
}
});
x.selectKeyByID(1, function(rows) {
console.log(rows.id);
console.log(rows.codeword);
console.log(rows.expiration_date);
});
x.selectKeyByCodeword('hallo', function(rows) {
console.log(rows);
});

x.updateKeyCodewordByID(1, true, 'test1');
x.updateKeyCodewordByID(2, false, 'test2');
x.updateDeviceByID(2, 'Client', 'update', 1);
x.updateDeviceKeyIDByID(1, 2);
*/