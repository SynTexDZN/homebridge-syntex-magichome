const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const preset = require('../presets'), custom = require('../custom');

module.exports = class SynTexPresetSwitchService extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;
		this.EventManager = manager.platform.EventManager;

		this.ips = serviceConfig.ips;
		this.preset = serviceConfig.preset || 'seven_color_cross_fade';
		this.speed = serviceConfig.speed || 100;
		this.shouldTurnOff = serviceConfig.shouldTurnOff || false;

		if(preset[this.preset] == null && custom[this.preset] == null)
		{
			this.logger.log('warn', this.id, this.letters, '%preset_not_found[0]% [' + this.preset + '] %preset_not_found[1]%!');
		}

		this.bindEmitter();

		this.changeHandler = (state) => {

			if(state.value != null)
			{
				this.setState(state.value,
					() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
			}
		};
	}

	setState(value, callback)
	{
		var promiseArray = [];

		Object.keys(this.ips).forEach((ip) => {
			
			promiseArray.push(new Promise((resolve) => {
			
				if(value == true)
				{
					// OPTIMIZE: Remove Timeout When LED is Already On

					this.DeviceManager.executeCommand(ip, '--on', (offline, output) => {
							
						var failed = offline || !output.includes('Turning on');

						if(!failed && preset[this.preset] != null)
						{
							setTimeout(() => this.DeviceManager.executeCommand(ip, '-p ' + preset[this.preset] + ' ' + this.speed, (offline, output) => {
								
								var failed = offline || !output.includes('Setting preset pattern');

								resolve(!failed);
								
							}), 1500);
						}
						else if(!failed && custom[this.preset] != null)
						{
							setTimeout(() => this.DeviceManager.executeCommand(ip, '-C ' + custom[this.preset].transition + ' ' + this.speed + ' "' + custom[this.preset].preset + '"', (offline, output) => {
								
								var failed = offline || !output.includes('Setting custom pattern');

								resolve(!failed);
								
							}), 1500);
						}
						else
						{
							if(!failed)
							{
								this.logger.log('error', this.id, this.letters, '%preset_not_found[0]% [' + this.preset + '] %preset_not_found[1]%!');
							}

							resolve(false);
						}
					});
				}
				else
				{
					this.DeviceManager.executeCommand(ip, ' -c ' + this.ips[ip], (offline, output) => {
						
						var failed = offline || !output.includes('Setting color');

						if(!failed && this.shouldTurnOff)
						{
							setTimeout(() => this.DeviceManager.executeCommand(ip, '--off', (offline, output) => {

								var failed = offline || !output.includes('Turning off');

								resolve(!failed);

							}), 1500);
						}
						else
						{
							resolve(!failed);
						}
					});
				}
			}));
		});

		Promise.all(promiseArray).then((result) => {
				
			if(result.includes(true))
			{
				super.setState(value, () => callback());

				this.EventManager.setOutputStream('resetSwitch', { sender : this }, Object.keys(this.ips));

				this.AutomationSystem.LogikEngine.runAutomation(this, { value });
			}
			else
			{
				callback(new Error('Offline'));
			}
		});
	}

	updateState(state)
	{
		if(state.value != null && !isNaN(state.value) && (!super.hasState('value') || this.value != state.value))
		{
			super.setState(state.value, 
				() => this.service.getCharacteristic(this.Characteristic.On).updateValue(state.value));
		}

		this.AutomationSystem.LogikEngine.runAutomation(this, state);
	}

	bindEmitter()
	{
		this.EventManager.setInputStream('resetSwitch', { source : this, destination : this.id }, (ips) => {

			var changed = false;

			for(const ip of ips)
			{
				if(Object.keys(this.ips).includes(ip))
				{
					changed = true;
				}
			}

			if(changed)
			{
				this.updateState({ value : false });
			}
		});
	}
}