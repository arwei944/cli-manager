import { execSync } from 'node:child_process';
import { isWindows } from '../utils/platform';

const versionCache = new Map<string, { version: string | null; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

const VERSION_FLAGS = ['--version', '-v', 'version'];
const VERSION_REGEX = /(\d+\.\d+[\w.\-]*)/;

// 系统工具候选集：对黑名单外的工具才用 exec 探测，避免误伤
const SYSTEM_DENYLIST = new Set([
  'conhost','csrss','dwm','explorer','lsass','services','smss','spoolsv','svchost',
  'taskhostw','wininit','winlogon','wmiprvse','wuauclt','wusa','searchindexer',
  'RuntimeBroker','ShellExperienceHost','StartMenuExperienceHost','SecurityHealthService',
  'registry','ntoskrnl','hal','ci','migwiz','sppnotify','sppsvc','TrustedInstaller',
  'AppHostRegistrationVerifier','BackgroundTransferService','BcastDVRService',
  'BFE','BITS','Browser','bthserv','camsvc','CDPSvc','CDPUserSvc',
  'certsvc','ClipSVC','CoreMessagingRegistrar','cryptnet','CryptSvc',
  'CscService','dcache','defragsvc','DeviceAssociationService','DeviceInstall','DevicesFlowUserSvc',
  'dfdwiz','diagnosticinvoker','diagtrack','DialogBlockingService','Dnscache',
  'DoSvc','DPS','DsmSvc','EapHost','EFS','elhkmsvc','enterprisewisvc',
  'eventlog','EventSystem','Fax','fdPHost','FDResPub','fhsvc',
  'FontCache','gpsvc','hidserv','hkeylocalmachine','icadesktop','icamux','icssvc',
  'IKEEXT','InstallService','iphlpsvc','ipnathlp','keyiso','KNSoftScore',
  'KtmRm','LanmanServer','LanmanWorkstation','lltdsvc','lmhosts','LSCAgentSvc',
  'LSM','MapsBroker','Mcx2Svc','MicrosoftEdgeUpdate','MixedRealityService','MMCSS',
  'MpsSvc','msiserver','MSSQL$SQLEXPRESS','NcdAutoSetup','Netlogon','NetMsmqActivator','NetworkSetupSvc',
  'NetTCP','NetTcpPortSharing','NlaSvc','nsi','OneDrive','p2psvc','p2pimsvc',
  'PcaEngine','PeerDist','pla','PlugPlay','PolicyAgent','powercfg','PrintNotify',
  'profsvc','ProfSvc','PushToInstall','QoS','QuietHours','RasAuto','RasMan',
  'RemoteAccess','RemoteRegistry','RpcEptMapper','RpcLocator','RpcSs','rtwisvc',
  'SCardSvr','Schedule','SCPolicySvc','SDRSVC','SearchIndexer','SEMgrSvc',
  'SensorDataService','SensorService','SessionEnv','sethc','SharedAccess',
  'shp','smphost','SNMPTRAP','spectrum','srvsvc','StateRepository',
  'stisvc','svsm','swprv','SysMain','SystemEventsBroker','TabletInputService',
  'TapiSrv','TermService','ThemeSvc','ThreatProtection','TokenBroker',
  'TrkWks','TrustedInstaller','TzAutoupdate','TzUpdate','UALSVC',
  'unimdm','upnphost','UserManager','UserProfileSvc','vaultsvc',
  'vp','W32Time','WalletService','WbioSrvc','WcsPlugInService','wcncsvc',
  'WdiServiceHost','WdiSystemHost','WebClient','wercplsupport','Wecsvc',
  'wfs','WinDefend','WinHttpAutoProxySvc','Winmgmt','WinRM','wisvc',
  'WMPNetworkSvc','WpnService','WpnUserService','wscsvc','WSearch',
  'wuauserv','XblAuthManager','XblAuthSvc','XboxNetApiSvc'
]);

function execVersionCmd(command: string): string | null {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      timeout: 1500,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const text = result.trim();
    if (!text) return null;
    const match = text.match(VERSION_REGEX);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function extractVersion(fullPath: string, name: string): string | null {
  const lower = name.toLowerCase();
  // 黑名单及极短名称跳过
  if (SYSTEM_DENYLIST.has(lower) || lower.length < 2) return null;
  return execVersionCmd(`"${fullPath}" --version`) || execVersionCmd(`"${fullPath}" -v`);
}

export function clearVersionCache(): void {
  versionCache.clear();
}
