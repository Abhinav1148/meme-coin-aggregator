import { JupiterClient } from '../jupiter';

describe('JupiterClient', () => {
  let client: JupiterClient;

  beforeEach(() => {
    client = new JupiterClient();
  });

  it('should be instantiated', () => {
    expect(client).toBeInstanceOf(JupiterClient);
  });

  // Integration tests would go here
});

