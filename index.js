const fs = require('fs'), path = require('path');

const { DynamicPlatform } = require('homebridge-syntex-dynamic-platform');

const SynTexUniversalAccessory = require('./src/universal');

const DeviceManager = require('./src/device-manager');

const pluginID = 'homebridge-syntex-magichome';
const pluginName = 'SynTexMagicHome';
const pluginVersion = require('./package.json').version;

module.exports = (homebridge) => homebridge.registerPlatform(pluginID, pluginName, SynTexMagicHomePlatform, true);

class SynTexMagicHomePlatform extends DynamicPlatform
{
	constructor(log, config, api)
	{
		super(config, api, pluginID, pluginName, pluginVersion);
		
		this.pollingInterval = this.options['pollingInterval'] == 0 ? 0 : (this.options['pollingInterval'] || 10);

		if(this.api != null && this.logger != null && this.files != null)
		{
			try
			{
				fs.accessSync(path.join(__dirname + '/src/flux_led.py'), fs.constants.X_OK);
			}
			catch(e)
			{
				const { exec } = require('child_process');

				exec('sudo chmod 777 ' + path.join(__dirname + '/src/flux_led.py'), (error) => {

					if(error)
					{
						this.logger.log('error', 'bridge', 'Bridge', '%permission_error% [flux_led.py] %execute_yourself% [sudo chmod 777 ' + path.join(__dirname + '/src/flux_led.py') + ']', error);
					}
				});
			}
			
			this.api.on('didFinishLaunching', () => {

				this.DeviceManager = new DeviceManager(this);

				this.loadAccessories();

				this.DeviceManager.refreshAccessories(this.accessories);

				if(this.pollingInterval > 0)
				{
					this.refreshInterval = setInterval(() => this.DeviceManager.refreshAccessories(this.accessories), this.pollingInterval * 1000);
				}
			});
		}
		else
		{
			throw new Error('Minimal parameters not configurated. Please check the README! https://github.com/SynTexDZN/homebridge-syntex-magichome/blob/master/README.md');
		}
	}

	loadAccessories()
	{
		for(const device of this.devices)
		{
			const homebridgeAccessory = this.getAccessory(device.id);

			device.manufacturer = this.pluginName;

			this.addAccessory(new SynTexUniversalAccessory(homebridgeAccessory, device, { platform : this, DeviceManager : this.DeviceManager }));
		}

		super.loadAccessories();
	}
}