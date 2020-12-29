let DeviceManager = require('./device-manager');

const { DynamicPlatform } = require('homebridge-syntex-dynamic-platform');

const SynTexUniversalAccessory = require('./src/universal');

const pluginID = 'homebridge-syntex-magichome';
const pluginName = 'SynTexMagicHome';
const pluginVersion = require('./package.json').version;

module.exports = (homebridge) => homebridge.registerPlatform(pluginID, pluginName, SynTexMagicHomePlatform, true);

class SynTexMagicHomePlatform extends DynamicPlatform
{
	constructor(log, config, api)
	{
		super(config, api, pluginID, pluginName, pluginVersion);
		
		this.devices = config['accessories'] || [];

		this.polling_interval = config['polling_interval'] == 0 ? 0 : config['polling_interval'] || 10;
		
		if(this.api && this.logger)
		{
			this.api.on('didFinishLaunching', () => {

				DeviceManager = new DeviceManager(this.logger);

				const { exec } = require('child_process');
						
				exec('sudo chmod 777 -R /usr/local/lib/node_modules/' + pluginID + '/src/flux_led.py', (error, stdout, stderr) => {

					if(error)
					{
						this.logger.log('error', 'bridge', 'Bridge', '%execution_error% [flux_led.py] ' + error);
					}
				});

				this.loadAccessories();

				DeviceManager.refreshAccessories(this.accessories);
				
				if(this.polling_interval != 0)
				{
					this.refreshInterval = setInterval(() => {

						DeviceManager.refreshAccessories(this.accessories);
		
					}, this.polling_interval * 1000);
				}
				
				this.finishInit();
			});
		}
	}

	loadAccessories()
	{
		for(const device of this.devices)
		{
			const homebridgeAccessory = this.getAccessory(device.id);

			this.addAccessory(new SynTexUniversalAccessory(homebridgeAccessory, device, { platform : this, logger : this.logger, DeviceManager : DeviceManager }));
		}
	}
}