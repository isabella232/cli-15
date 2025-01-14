import {Command, flags} from '@oclif/command';
import {AuthenticatedClient} from '../../lib/platform/authenticatedClient';
import {cli} from 'cli-ux';
import {
  Preconditions,
  IsAuthenticated,
} from '../../lib/decorators/preconditions/';
import {OrganizationCreationOrigin} from '@coveord/platform-client';
import {Config} from '../../lib/config/config';
import {bold} from 'chalk';
import dedent from 'ts-dedent';
import {Trackable} from '../../lib/decorators/preconditions/trackable';

export default class Create extends Command {
  public static description = 'Create a new test Coveo organization.';

  public static flags = {
    setDefaultOrganization: flags.boolean({
      char: 's',
      default: true,
      allowNo: true,
      description: 'Set the created organization as the default one',
    }),
  };

  public static args = [
    {
      name: 'name',
      helpValue: 'neworg-prod',
      description: 'The name to assign to the new organization.',
      required: true,
    },
  ];

  @Trackable()
  @Preconditions(IsAuthenticated())
  public async run() {
    cli.action.start('Creating organization');
    const {id} = await this.createOrganization();
    const endMessage = await this.generateEndMessageFromOrgId(id);
    cli.action.stop(endMessage);
  }

  @Trackable()
  public async catch(err?: Error) {
    throw err;
  }

  private async createOrganization() {
    const {args} = this.parse(Create);
    const client = await new AuthenticatedClient().getClient();
    return client.organization.create({
      creationOrigin: OrganizationCreationOrigin.CLI,
      name: args.name,
      organizationTemplate: 'Developer',
    });
  }

  private async generateEndMessageFromOrgId(orgId: string) {
    const {flags} = this.parse(Create);
    const color1 = bold.cyan;
    let color2 = bold.magenta;
    if (flags.setDefaultOrganization) {
      this.configuration.set('organization', orgId);
      color2 = bold.cyan;
    }

    const cfg = await this.configuration.get();
    const message = dedent`Organization ${color1(orgId)} successfully created.

    You are currently logged into organization ${color2(
      cfg.organization
    )} and further command will be ran against that organization by default.

    If you wish to switch organization use \`coveo config:set\`.

    To see current configuration use \`coveo config:get\``;

    return message;
  }

  private get configuration() {
    return new Config(this.config.configDir, this.error);
  }
}
