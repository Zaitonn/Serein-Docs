/*!
 * @Author       : Maraudern
 * @Date         : 2023-01-16 20:19:47
 * @LastEditors  : Maraudern
 * @LastEditTime : 2023-01-18 17:47:28
 * @FilePath     : \Serein\BetterWhitelist.js
 * @Description  : 更好的白名单
 */
serein.registerPlugin("更好的白名单", "v1.1", "Maraudern", "需删除正则跟事件，更好的白名单增删方案");

const File = importNamespace("System.IO").File;
const Directory = importNamespace("System.IO").Directory;
const Encoding = importNamespace("System.Text").Encoding;

const PluginPath = "plugins/BetterWhiteList/config.json"; // 插件配置
const MemberPath = "data/members.json"; // 成员管理

const isXboxID = /^[A-Za-z]{1}[0-9A-Za-z ]{4,14}$/; // 判断 XboxID
const isQQNumber = /^[0-9]{5,11}$/; // 判断 QQ号
const isCqAt = /^\[CQ:at,qq=(\d+)\]$/; // 判断 CQ:at

let config = {
	"1//": "排除指定监听群聊",
	ignoreGroup: [],
	"2//": "开/关退群删除成员管理数据",
	exitGroup: true, // 待实现
	"3//": "开/关同步游戏白名单",
	whiteList: true,
	"4//": "开/关群成员绑定自己白名单的权限",
	bindSelf: true,
};

if (!Directory.Exists("plugins/BetterWhiteList")) {
	// 确定配置文件夹是否存在
	Directory.CreateDirectory("plugins/BetterWhiteList");
}
if (!File.Exists(PluginPath)) {
	// 确定配置文件是否存在
	File.WriteAllText(PluginPath, JSON.stringify(config, null, 4));
} else {
	config = JSON.parse(File.ReadAllText(PluginPath));
}

/**
 * @description: 判断是否在面板管理权限列表
 * @param {Number} userID QQ号
 * @return {Boolean} 是为true，否为false
 */
function isPermission(userID) {
	return Boolean(JSON.parse(serein.getSettings()).Bot.PermissionList.indexOf(userID) + 1);
}

/**
 * @description: 判断是否在面板监听群列表
 * @param {Number} groupID QQ群号
 * @return {Boolean} 是为true，否为false
 */
function isListenerGroup(groupID) {
	return Boolean(JSON.parse(serein.getSettings()).Bot.GroupList.indexOf(groupID) + 1);
}

/**
 * @description: 添加白名单
 * @param {Number} userID QQ号
 * @param {String} xboxID 游戏ID
 * @return {Boolean} 成功为true，否则为false
 */
function whiteListAdd(userID, xboxID) {
	if (config.whiteList) {
		serein.sendCmd(`whitelist add "${xboxID}"`);
	}
	return serein.bindMember(userID, xboxID);
}

/**
 * @description: 删除白名单
 * @param {Number} userID QQ号
 * @param {String} xboxID 游戏ID
 * @return {Boolean} 成功为true，否则为false
 */
function whiteListRemove(userID, xboxID) {
	if (config.whiteList) {
		serein.sendCmd(`whitelist remove "${xboxID}"`);
	}
	return serein.unbindMember(userID); // 1.3.3 版本 unbindMember 返回值有误
}

serein.setListener("onReceiveGroupMessage", (groupId, userId, msg, shownName) => {
	var command = msg.split(" ").filter((item) => item && item.trim());

	var keyWord = command[0];
	command.splice(0, 1);

	var qqNumber;
	var text;

	if (isListenerGroup && config.ignoreGroup.indexOf(groupId) === -1) {
		switch (keyWord.toLowerCase()) {
			case "添加白名单":
			case "wladd":
			case "whitelistadd":
				if (isPermission(userId)) {
					// 判断是否有管理员权限

					qqNumber = command[0].replace(isCqAt, "$1");
					command.splice(0, 1);

					if (isQQNumber.test(qqNumber)) {
						// 判断是否是QQ号

						if (command.length) {
							// 判断分割数组是否有值

							text = command.join(" ");

							if (isXboxID.test(text)) {
								// 判断 text 是否符合 xboxID 规范

								let xboxID = serein.getGameID(qqNumber);
								let members = JSON.parse(File.ReadAllText(MemberPath, Encoding.UTF8));

								for (let i = 0; i < members.data.length; i++) {
									if (text === members.data[i].GameID) {
										serein.sendGroup(groupId, `绑定失败，存在相同 XboxID\n${text}（${members.data[i].ID}）`);
										return;
									}
								}

								if (xboxID) {
									whiteListRemove(qqNumber, xboxID);
									if (whiteListAdd(qqNumber, text)) {
										serein.sendGroup(groupId, `已存在数据：\n${xboxID}(${qqNumber})\n成功修改为：\n${text}(${qqNumber})`);
									}
									return;
								}

								if (whiteListAdd(qqNumber, text)) {
									serein.sendGroup(groupId, `绑定成功：${text}（${qqNumber}）`);
								}
								return;
							} else {
								serein.sendGroup(groupId, `意外的：>>${text}<< \n应当为：<XboxID>`);
								return;
							}
						} else {
							serein.sendGroup(groupId, `语法错误，请发送：\n\n${keyWord} <QQ号>(@成员) <XboxID>`);
							return;
						}
					} else {
						serein.sendGroup(groupId, `意外的：>>${qqNumber}<< \n应当为：<QQ号> 或 <@成员>`);
						return;
					}
				} else {
					serein.sendGroup(groupId, "您没有<添加白名单>的权限！");
					return;
				}
			case "删除白名单":
			case "wldel":
			case "whitelistdelete":
				if (isPermission(userId)) {
					// 判断是否有管理员权限

					if (command.length) {
						// 判断分割数组是否有值

						let qqNumber = command[0].replace(isCqAt, "$1");

						if (isQQNumber.test(qqNumber)) {
							// 判断是否是QQ号

							let xboxID = serein.getGameID(qqNumber);

							if (xboxID) {
								whiteListRemove(qqNumber, xboxID);
								//if (whiteListRemove(qqNumber, xboxID))
								serein.sendGroup(groupId, `成功删除：${xboxID}（${qqNumber}）`);
								//}
								return;
							} else {
								serein.sendGroup(groupId, "没有绑定白名单！");
								return;
							}
						} else {
							serein.sendGroup(groupId, `意外的：>>${qqNumber}<<\n应当为：<QQ号>(@成员)`);
							return;
						}
					} else {
						serein.sendGroup(groupId, `语法错误，请发送：\n\n${keyWord} <QQ号>(@成员)`);
						return;
					}
				} else {
					serein.sendGroup(groupId, "您没有<删除白名单>的权限！");
					return;
				}
			case "白名单列表":
			case "wllist":
			case "whitelist":
				if (isPermission(userId)) {
					// 判断是否有管理员权限
					/**
					 *
					 *
					 *
					 */
					return;
				} else {
					serein.sendGroup(groupId, "您没有<查看白名单列表>的权限！");
					return;
				}
			case "绑定":
			case "bind":
				if (isPermission(userId) || config.bindSelf) {
					// 判断是否有管理员权限 或 配置是否开启 bindSelf

					if (command.length) {
						// 判断分割数组是否有值

						text = command.join(" ");

						if (isXboxID.test(text)) {
							// 判断 text 是否符合 xboxID 规范

							let xboxID = serein.getGameID(userId);
							let members = JSON.parse(File.ReadAllText(MemberPath, Encoding.UTF8));

							for (let i = 0; i < members.data.length; i++) {
								if (text === members.data[i].GameID) {
									serein.sendGroup(groupId, `绑定失败，存在相同 XboxID\n${text}（${members.data[i].ID}）`);
									return;
								}
							}

							if (xboxID) {
								whiteListRemove(userId, xboxID);
								if (whiteListAdd(userId, text)) {
									serein.sendGroup(groupId, `已存在数据：\n${xboxID}(${userId})\n成功修改为：\n${text}(${userId})`);
								}
								return;
							}

							if (whiteListAdd(userId, text)) {
								serein.sendGroup(groupId, `绑定成功：${text}（${userId}）`);
							}

							return;
						} else {
							serein.sendGroup(groupId, `意外的：>>${text}<< \n应当为：<XboxID>`);
							return;
						}
					} else {
						serein.sendGroup(groupId, `语法错误，请发送：\n\n${keyWord} <XboxID>`);
						return;
					}
				} else {
					serein.sendGroup(groupId, "您没有<绑定白名单>的权限！");
					return;
				}
			case "解绑":
			case "unbind":
				if (isPermission(userId) || config.bindSelf) {
					// 判断是否有管理员权限 或 配置是否开启 bindSelf

					let xboxID = serein.getGameID(userId);

					if (xboxID) {
						whiteListRemove(userId, xboxID);
						//if (whiteListRemove(userId, xboxID))
						serein.sendGroup(groupId, `成功解绑：${xboxID}（${userId}）`);
						//}
						return;
					} else {
						serein.sendGroup(groupId, "您没有绑定白名单！");
						return;
					}
				} else {
					serein.sendGroup(groupId, "您没有<解绑白名单>的权限！");
					return;
				}
				break;
		}
	}
});
