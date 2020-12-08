let Characteristic, DeviceManager;

const { SwitchService } = require('homebridge-syntex-dynamic-platform');

const preset = require('../presets');
const emitter = require('../emitter');

module.exports = class PresetSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		DeviceManager = manager.DeviceManager;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);
		
		this.ips = deviceConfig.ips;
		this.shouldTurnOff = deviceConfig.shouldTurnOff || false;
		this.preset = deviceConfig.preset || 'seven_color_cross_fade';
		this.speed = deviceConfig.speed || 40;
		this.sceneValue = preset[this.preset];

		if(this.sceneValue == null)
		{
			this.logger.log('warn', 'bridge', 'Bridge', 'Das Preset [' + this.preset + '] wurde nicht gefunden. Es wird das Default-Preset [seven_color_cross_fade] verwendet!');
			this.sceneValue = 37;
		}

		this.bindEmitter();

		this.changeHandler = (state) =>
        {
            if(state.power != null)
            {
				this.setState(state.power, () => {});
            }
        };
	}

	getState(callback)
    {
        super.getState((value) => {

            if(value != null)
            {
				this.power = value;
				
				this.logger.log('read', this.id, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + this.power + '] ( ' + this.id + ' )');
			}
				
			callback(null, value != null ? value : false);
        });
	}

	setState(value, callback)
	{
		this.power = value;

		if(value == true)
		{
			emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, Object.keys(this.ips));

			DeviceManager.executeCommand(Object.keys(this.ips), '--on', () => {

				setTimeout(() => DeviceManager.executeCommand(Object.keys(this.ips), '-p ' + this.sceneValue + ' ' + this.speed, () => {

					super.setState(true, () => {

						this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
					
						callback();
					});

				}), 1500);
			});
		}
		else
		{
			var promiseArray = [];

			Object.keys(this.ips).forEach((ip) => {

				const newPromise = new Promise((resolve) => {

					DeviceManager.executeCommand(ip, ' -c ' + this.ips[ip], () => resolve());
				});

				promiseArray.push(newPromise);
			});

			Promise.all(promiseArray).then(() => {

				if(this.shouldTurnOff)
				{
					setTimeout(() => DeviceManager.executeCommand(Object.keys(this.ips), '--off', () => {}, 1500));
				}
				
				super.setState(false, () => {

					this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
				
					callback();
				});
			});
		}
	}

	updateState(value)
	{
		this.power = value;

		super.setState(this.power, () => {});

		this.homebridgeAccessory.services[1].getCharacteristic(Characteristic.On).updateValue(this.power);
	}

	bindEmitter()
	{
		emitter.on('SynTexMagicHomePresetTurnedOn', (presetName, ips) => {

			if(presetName != this.name)
			{
				var updateState = false;

				for(const ip of ips)
				{
					if(Object.keys(this.ips).includes(ip))
					{
						updateState = true;
					}
				}

				if(updateState)
				{
					this.updateState(false);
				}
			}
		})
	}
}