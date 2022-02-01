let DeviceManager = require('./src/device-manager'), AutomationSystem = require('syntex-automation');

const { DynamicPlatform, ContextManager } = require('homebridge-syntex-dynamic-platform');

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

		this.pollingInterval = this.options['pollingInterval'] == 0 ? 0 : (this.options['pollingInterval'] || 10);

		if(this.api != null && this.logger != null && this.files != null)
		{
			const { exec } = require('child_process');

			exec('sudo chmod 777 -R ' + __dirname + '/src/flux_led.py', (error, stdout, stderr) => {

				if(error)
				{
					this.logger.log('error', 'bridge', 'Bridge', '%permission_error% [flux_led.py]', error);
				}
			});
			
			this.api.on('didFinishLaunching', () => {

				DeviceManager = new DeviceManager(this.logger);
				AutomationSystem = new AutomationSystem(this.logger, this.files, this, pluginName, this.api.user.storagePath());

				this.loadAccessories();
				this.initWebServer();

				DeviceManager.refreshAccessories(this.accessories);

				if(this.pollingInterval > 0)
				{
					this.refreshInterval = setInterval(() => DeviceManager.refreshAccessories(this.accessories), this.pollingInterval * 1000);
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

			device.manufacturer = pluginName;

			this.addAccessory(new SynTexUniversalAccessory(homebridgeAccessory, device, { platform : this, logger : this.logger, DeviceManager, AutomationSystem, ContextManager }));
		}
	}

	initWebServer()
	{
		if(this.port != null)
		{
			this.WebServer.addPage('/reload-automation', async (response) => {

				response.end(await AutomationSystem.LogikEngine.loadAutomation() ? 'Success' : 'Error');
			});
		}
	}
}