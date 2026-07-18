export type MediaFtpProtocol = 'ftp' | 'sftp';

export type MediaFtpConnectionView = {
  enabled: boolean;
  protocol: MediaFtpProtocol;
  host: string;
  port: number;
  username: string;
  password_set: boolean;
  password_preview: string | null;
  root: string;
  passive: boolean;
  ssl: boolean;
  timeout: number;
  private_key_set: boolean;
  disk_name: string;
};

export type MediaFtpConnectionPayload = {
  enabled?: boolean;
  protocol?: MediaFtpProtocol;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  root?: string;
  passive?: boolean;
  ssl?: boolean;
  timeout?: number;
  private_key?: string;
};

export type MediaFtpTestResult = {
  ok: boolean;
  message: string;
};
