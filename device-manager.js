const lightAgent = require('./src/lib/lightAgent');
const cp = require('child_process');
const path = require('path');
const convert = require('color-convert');

var accessories = [];

module.exports = class DeviceManager
{
    constructor(log)
    {
        this.logger = log;
    }

    getDevice(ip, callback)
	{
		this.executeCommand(ip, '-i', (error, stdout) => {

			var settings = {
				on: false,
				color: { hue: 255, saturation: 100, brightness: 50 }
			};

			var colors = stdout.match(/\(.*,.*,.*\)/g);
			var power = stdout.match(/\] ON /g);

			if(power && power.length > 0)
			{
				settings.on = true;
			}

			if(colors && colors.length > 0)
			{
				// Remove last char )
				var str = colors.toString().substring(0, colors.toString().length - 1);
				// Remove First Char (
				str = str.substring(1, str.length);

				const rgbColors = str.split(',').map((item) => {

					return item.trim()
				});

				var converted = convert.rgb.hsv(rgbColors);

				settings.color = {
					hue: converted[0],
					saturation: converted[1],
					brightness: converted[2]
				};
			}

			callback(settings);
		})
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

		this.logger.debug(cmd);
		
		exec(cmd, (err, stdOut) => {
			
			this.logger.debug(stdOut);
			
			if(err)
			{
				this.logger.log('error', 'bridge', 'Bridge', 'Es fehlen Berechtigungen zum Ausführen von [flux_led.py] ' + err);
			}

			if(callback)
			{
				callback(err, stdOut);
			}
		});
	}
}