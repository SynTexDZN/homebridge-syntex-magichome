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

		this.pollingInterval = config['pollingInterval'] == 0 ? 0 : config['pollingInterval'] || 10;
		
		if(this.api && this.logger)
		{
			const { exec } = require('child_process');
						
			exec('sudo chmod 777 -R /usr/local/lib/node_modules/' + pluginID + '/src/flux_led.py', (error, stdout, stderr) => {

				if(error)
				{
					this.logger.log('error', 'bridge', 'Bridge', '%execution_error% [flux_led.py] ' + error);
				}
			});
			
			this.api.on('didFinishLaunching', () => {

				DeviceManager = new DeviceManager(this.logger);

				this.loadAccessories();

				DeviceManager.refreshAccessories(this.accessories);
				
				if(this.pollingInterval != 0)
				{
					this.refreshInterval = setInterval(() => {

						DeviceManager.refreshAccessories(this.accessories);
		
					}, this.pollingInterval * 1000);
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