const mqtt = require('mqtt');
const readlineSync = require('readlineSync');
var mqttServer = readlineSync.question('Enter IP address of the server: ')
var mqttT = readlineSync.question('topic name: ')
var mqttU = readlineSync.question('username?: ')
var mqttPW = readlineSync.question('password?: ')
function rls(resp) {

};
rls(url)
const mode = process.argv.slice(2).length > 0 ? process.argv.slice(2)[0] : readlineSync.question("read/write?: ");
const mosquitto = mqtt.connect(mqttServer, {
  username: mqttU,
  password: mqttPW,
  clean: true,
  connectTimeout: 5000,
  clientId: `pawele_23_byte_string00`,
});

mosquitto.on('connect', () => {
  console.log("connected")
  mosquitto.subscribe(mqttT, function (err) {
    if (err) {
      throw console.error(err)
    }
    var readline = require('readline').createInterface({ input, output });
    if (mode === "write") {
      readline.on('line', (line) => {
        mosquitto.publish(mqttT, line, {
          retain: false, // will show as a latest message
        })
      });
    }
  })
})


mosquitto.on('message', function (topic, message) {
  if (mode === "read") {
    console.log("[" + topic + "] " + message.toString())
  }
})