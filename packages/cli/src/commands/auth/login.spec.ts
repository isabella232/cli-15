jest.mock('../../lib/oauth/oauth');
jest.mock('../../lib/config/config');
jest.mock('../../hooks/analytics/analytics');
jest.mock('../../hooks/prerun/prerun');
jest.mock('../../lib/platform/authenticatedClient');
jest.mock('@coveord/platform-client');
import {Region} from '@coveord/platform-client';
import {test} from '@oclif/test';
import {Config} from '../../lib/config/config';
import {OAuth} from '../../lib/oauth/oauth';
import {AuthenticatedClient} from '../../lib/platform/authenticatedClient';
const mockedOAuth = jest.mocked(OAuth, true);
const mockedConfig = jest.mocked(Config, true);
const mockedAuthenticatedClient = jest.mocked(AuthenticatedClient);

describe('auth:login', () => {
  const mockConfigSet = jest.fn();

  const mockConfigGet = jest.fn().mockReturnValue(
    Promise.resolve({
      region: 'us',
      organization: 'foo',
      environment: 'prod',
    })
  );

  const mockListOrgs = jest
    .fn()
    .mockReturnValue(Promise.resolve([{id: 'foo'}]));

  const mockGetHasAccessToOrg = jest
    .fn()
    .mockReturnValue(Promise.resolve(true));

  beforeEach(() => {
    mockedAuthenticatedClient.mockImplementation(
      () =>
        ({
          getAllOrgsUserHasAccessTo: mockListOrgs,
          getUserHasAccessToOrg: mockGetHasAccessToOrg,
        } as unknown as AuthenticatedClient)
    );
    mockedOAuth.mockImplementationOnce(
      () =>
        ({
          getToken: () =>
            Promise.resolve({
              accessToken: 'this-is-the-token',
            }),
        } as OAuth)
    );

    mockedConfig.mockImplementation(
      () =>
        ({
          get: mockConfigGet,
          set: mockConfigSet,
        } as unknown as Config)
    );
  });

  afterEach(() => {
    mockConfigSet.mockClear();
  });

  test
    .stdout()
    .stderr()
    .command(['auth:login', '-e', 'foo'])
    .catch(/Expected --environment=foo/)
    .it('reject invalid environment', async () => {});

  test
    .stdout()
    .stderr()
    .command(['auth:login', '-r', 'foo'])
    .catch(/Expected --region=foo/)
    .it('reject invalid region', async () => {});

  ['dev', 'qa', 'prod', 'hipaa'].forEach((environment) => {
    test
      .stdout()
      .stderr()
      .command(['auth:login', '-e', environment, '-o', 'foo'])
      .it(
        `passes the -e=${environment} flag to oauth and configuration`,
        () => {
          expect(mockedOAuth.mock.calls[0][0]?.environment).toBe(environment);
          expect(mockConfigSet).toHaveBeenCalledWith(
            'environment',
            environment
          );
        }
      );
  });

  Object.keys(Region).forEach((region) => {
    test
      .stdout()
      .stderr()
      .command(['auth:login', '-r', region, '-o', 'foo'])
      .it(`passes the -e=${region} flag to oauth and configuration`, () => {
        expect(mockedOAuth.mock.calls[0][0]?.region).toBe(region);
        expect(mockConfigSet).toHaveBeenCalledWith('region', region);
      });
  });

  test
    .stdout()
    .stderr()
    .command(['auth:login', '-e', 'qa', '-o', 'foo'])
    .it('passed the -e=dev flag to oauth as an environment', () => {
      expect(mockedOAuth.mock.calls[0][0]?.environment).toBe('qa');
    });

  describe('retrieves token from oauth service', () => {
    test
      .stdout()
      .stderr()
      .command(['auth:login', '-o', 'foo'])
      .it('save token from oauth service', () => {
        expect(mockConfigSet).toHaveBeenCalledWith(
          'accessToken',
          'this-is-the-token'
        );
      });
    test
      .stdout()
      .stderr()
      .command(['auth:login', '-o', 'foo'])
      .it('set anonymous to false', () => {
        expect(mockConfigSet).toHaveBeenCalledWith('anonymous', false);
      });
  });

  test
    .stdout()
    .stderr()
    .do(() => {
      mockGetHasAccessToOrg.mockReturnValueOnce(Promise.resolve(false));
    })
    .command(['auth:login', '-o', 'this_is_not_a_valid_org'])
    .exit(2)
    .it('fails when organization flag is invalid');

  test
    .do(() => {
      mockListOrgs.mockReturnValueOnce(Promise.resolve([]));
    })
    .stdout()
    .stderr()
    .command(['auth:login'])
    .exit(2)
    .it(
      'fails when no organization flag is passed and the user has access to no organization'
    );

  test
    .stdout()
    .stderr()
    .command(['auth:login', '-o', 'foo'])
    .it('succeed when organization flag is valid', (ctx) => {
      expect(ctx.stdout).toContain('Success');
    });

  test
    .do(() => {
      mockListOrgs.mockReturnValueOnce(
        Promise.resolve([{id: 'the_first_org_available'}])
      );
      mockConfigGet.mockReturnValueOnce(
        Promise.resolve({
          region: 'us',
          organization: 'the_first_org_available',
          environment: 'prod',
        })
      );
    })
    .stdout()
    .stderr()
    .command(['auth:login'])
    .it(
      'succeed when no organization flag is passed, and uses the first available org instead',
      (ctx) => {
        expect(ctx.stdout).toContain('Success');
        expect(ctx.stdout).toContain('the_first_org_available');
      }
    );
});
