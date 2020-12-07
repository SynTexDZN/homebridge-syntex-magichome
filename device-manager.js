const lightAgent = require('./src/lib/lightAgent');
const cp = require('child_process');
const path = require('path');

const store = require('json-fs-store');
var logger, storage, accessories = [];

module.exports = class DeviceManager
{
    constructor(log, storagePath)
    {
        logger = log;
        storage = store(storagePath);
    }

    getDevice(mac, service)
    {
        return new Promise(async (resolve) => {

            var found = false;

            for(var i = 0; i < accessories.length; i++)
            {
                if(accessories[i].mac == mac && accessories[i].service == service)
                {
                    found = true;

                    resolve(accessories[i].value);
                }
            }

            if(!found)
            {
                var accessory = {
                    mac : mac,
                    service : service,
                    value : await readFS(mac, service)
                };

                accessories.push(accessory);

                resolve(accessory.value);
            }
        });
    }

    setDevice(mac, service, value)
    {
        return new Promise(async (resolve) => {

            var found = false;

            for(var i = 0; i < accessories.length; i++)
            {
                if(accessories[i].mac == mac && accessories[i].service == service)
                {
                    accessories[i].value = value;

                    found = true;
                }
            }

            if(!found)
            {
                accessories.push({ mac : mac, service : service, value : value });
            }

            await writeFS(mac, service, value);

            resolve();
        });
    }

    executeCommand(address, command, callback)
	{
		const exec = cp.exec;
		const cmd = path.join(__dirname, './src/flux_led.py ' + lightAgent.getAddress(address) + command);

		logger.debug(cmd);
		
		exec(cmd, (err, stdOut) => {
			
			logger.debug(stdOut);
			
			if(err)
			{
				logger.log('error', 'bridge', 'Bridge', 'Es fehlen Berechtigungen zum Ausführen von [flux_led.py] ' + err);
			}

			if(callback)
			{
				callback(err, stdOut);
			}
		});
	}
}

function readFS(mac, service)
{
    return new Promise(resolve => {

        storage.load(mac + ':' + service, (err, device) => {    

            resolve(device && !err ? device.value : null);
        });
    });
}

function writeFS(mac, service, value)
{
    return new Promise(resolve => {
        
        var device = {
            id: mac + ':' + service,
            value: value
        };
        
        storage.add(device, (err) => {

            if(err)
            {
                logger.log('error', 'bridge', 'Bridge', mac + '.json konnte nicht aktualisiert werden! ' + err);
            }

            resolve(err ? false : true);
        });
    });
}