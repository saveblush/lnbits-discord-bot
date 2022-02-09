const Discord = require(`discord.js`);
const Command = require(`./Command.js`);
const UserManager = require(`../lnbitsAPI/UserManager.js`);
const UserWallet = require("../lnbitsAPI/User.js");

/*
This command will send a specified amount of sats to random users
*/

class Rain extends Command {
  constructor() {
    super();
    this.name = `rain`;
    this.description = `Send an amount of sats to multiple random users.`;
    this.options = [
      {
        'name': 'amount',
        'description': 'Amount of sats to give to each user',
        'type': 'INTEGER',
        'required': true
      },
      {
        'name': 'users',
        'description': 'To how much users do you want to give sats?',
        'type': 'INTEGER',
        'required': true
      },
      {
        'name': 'message',
        'description': 'Message to send with your transaction',
        'type': 'STRING',
        'required': false
      },
      {
        'name': 'roles',
        'description': 'Only users with one of the given roles can receive sats',
        'type': 'STRING',
        'required': false
      }
    ];
  }

  async execute(Interaction) {
    const amount = Interaction.options.get('amount').value
    let users = Interaction.options.get('users').value
    let roles = Interaction.options.get('roles')
    let memo = Interaction.options.get('message')

    if (roles != null) {
      roles = roles.value
    }
    if(memo != null) {
      memo = memo.value
    }

    if (amount <= 0) {
      Interaction.reply({
        content: `Negative amounts are not permitted`,
        ephemeral: true
      });
      return;
    }

    if (users <= 0) {
      Interaction.reply({
        content: `Negative counts are not permitted`,
        ephemeral: true
      });
      return;
    }
    
    try {

      const um = new UserManager();
      let senderWallet = await um.getUserWallet(Interaction.user.id)

      if(senderWallet.adminkey) {
        senderWallet = new UserWallet(senderWallet.adminkey)
        const senderDetails = await senderWallet.getWalletDetails()
        if (senderDetails.balance/1000 < amount * users) {
          await Interaction.reply({
            content: 'You do not have enough balance',
            ephemeral: true
          })
          return;
        }

        await Interaction.deferReply();

        let validRoles = []
        if (roles != null) {
          const split = roles.split(' ')
          split.forEach(async (role) => {
            if (role.length > 3) {
              const id = role.substring(3, role.length - 1)
              const result = await Interaction.guild.roles.fetch(id)
              if (result != null) {
                validRoles.push(result)
              }
            }
          })
        }

        let member;
        try {
          member = await Interaction.guild.members.fetch(Interaction.user.id);
        } catch (err) {
          console.log(err);
        }
        
        if (Interaction.guild.members.cache.size < Interaction.guild.memberCount) {
          await Interaction.guild.members.fetch({force: true})
        }

        let rawMembers = await Interaction.channel.members
        let members = [];

        const randomInteger = (maxNumber) => {
          return Math.floor(Math.random() * maxNumber)
        }

        await rawMembers.forEach(async(guildMember, id) => {
          if(id != Interaction.user.id && guildMember.user.bot == false) {
            if (validRoles.length > 0) {
              for(const role of validRoles) {
                const result = await guildMember.roles.resolve(role.id)
                if(result != null) {
                  members.push(guildMember)
                  break;
                }
              }
            }
            else {
              members.push(guildMember)
            }
          }
        })

        if(members.length == 0) {
          await Interaction.editReply({
            content: 'Could not send Sats'
          });
          return;
        }
      
        let reply = `${memo != null ? memo + "\n" : ""}Sent ${amount} ${amount == 1 ? "Satoshi" : "Satoshis"} to\n`

        if(memo == undefined) {
          memo = `Rain by ${member.user.username}`
        }

        let usersSent = []

        while(users > 0 && members.length > 0) {
          const index = randomInteger(members.length)
          let receiverWallet = await um.getOrCreateWallet(members[index].user.username, members[index].user.id)
          
          if(receiverWallet.adminkey) {
            receiverWallet = new UserWallet(receiverWallet.adminkey)
            const invoice = await receiverWallet.createInvoice(amount, memo)
            const payment = await senderWallet.payInvoice(invoice.payment_request)

            usersSent.push({member: members[index], wallet: receiverWallet})
            reply += `${members[index].toString()}\n`
            members.splice(index, 1)
            users--;
          }
        }

        let embed = new Discord.MessageEmbed()
          .setTitle(`💸 Rain by ${member.user.username} 💸`)
          .setDescription(reply)
        
        const message = await Interaction.editReply({
          embeds: [embed]
        })

        usersSent.forEach(async(user) => {
          try {
            const balance = await user.wallet.getBalanceString()
            let embed = new Discord.MessageEmbed()
              .setTitle(`New Payment`)
              .setDescription(`You received **${amount} ${amount == 1 ? "Satoshi" : "Satoshis"}** from ${member.toString()}\n
                               Your new Balance: **${balance}**\n
                               The payment happened [here](https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id})`)
            user.member.send({embeds: [embed]});
          }
          catch(err) {
            console.log(err)
          }
        });

      }
      else {
        await Interaction.editReply({
          content: 'You do not have a wallet',
          ephemeral: true
        })
        return;
      }

    } catch(err) {
      console.log(err);
    }
  }
}

module.exports = Rain;