let Characteristic;

const SwitchService = require('./switch');
const preset = require('../presets');
const emitter = require('../lib/emitter');

module.exports = class PresetSwitch extends SwitchService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		Characteristic = manager.platform.api.hap.Characteristic;
		
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);
		
		this.ips = Object.keys(deviceConfig.ips);
		this.preset = deviceConfig.preset || 'seven_color_cross_fade';
		this.sceneValue = preset[this.preset];

		if(this.sceneValue == null)
		{
			this.logger.log('warn', 'bridge', 'Bridge', 'Das Preset [' + this.preset + '] wurde nicht gefunden. Es wird das Default-Preset [seven_color_cross_fade] verwendet!');
			this.sceneValue = 37;
		}

		this.speed = deviceConfig.speed || 40;
		this.shouldTurnOff = deviceConfig.shouldTurnOff || false;
		this.bindEmitter();

		this.changeHandler = async (state, refreshDevices) =>
        {
            if(state.power != null)
            {
				this.setState(state.power, () => {});
            }
        };
	}

	getState(callback)
    {
        super.getState((state) => {

            if(state != null)
            {
				this.power = state;
				
				this.logger.log('read', this.id, this.letters, 'HomeKit Status für [' + this.name + '] ist [' + this.power + '] ( ' + this.id + ' )');
			}
				
			callback(null, state != null ? state : false);
        });
	}

	setState(state, callback)
	{
		this.power = state;

		if(state == true)
		{
			emitter.emit('SynTexMagicHomePresetTurnedOn', this.name, this.ips);

			this.executeCommand(this.ips, '--on', () => {

				setTimeout(() => this.executeCommand(this.ips, '-p ' + this.sceneValue + ' ' + this.speed, () => {

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

			Object.keys(this.deviceConfig.ips).forEach((ip) => {

				const newPromise = new Promise((resolve) => {

					this.executeCommand(ip, ' -c ' + this.deviceConfig.ips[ip], () => resolve());
				});

				promiseArray.push(newPromise);
			});

			Promise.all(promiseArray).then(() => {

				if(this.shouldTurnOff)
				{
					setTimeout(() => this.executeCommand(this.ips, '--off', () => {}, 1500));
				}
				
				super.setState(false, () => {

					this.logger.log('update', this.id, this.letters, 'HomeKit Status für [' + this.name + '] geändert zu [' + this.power + '] ( ' + this.id + ' )');
				
					callback();
				});
			});
		}
	}

	updateState(state)
	{
		this.power = state;

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
					if(this.ips.includes(ip))
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