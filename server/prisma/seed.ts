import { PrismaClient, Role, VendorStatus } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VendorBridge database seed...');

  // Clean existing data for clean idempotent seed
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await hashPassword('Password@123');

  // 1. Seed 4 Core Role Users
  const adminUser = await prisma.user.create({
    data: {
      firstName: 'Alex',
      lastName: 'Mitchell',
      email: 'admin@vendorbridge.local',
      passwordHash: defaultPasswordHash,
      phone: '+919876543201',
      country: 'India',
      role: Role.ADMIN,
      additionalInfo: 'System Administrator & Superuser',
    },
  });

  const officerUser = await prisma.user.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'officer@vendorbridge.local',
      passwordHash: defaultPasswordHash,
      phone: '+919876543202',
      country: 'India',
      role: Role.PROCUREMENT_OFFICER,
      additionalInfo: 'Senior Procurement Officer',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      firstName: 'David',
      lastName: 'Ross',
      email: 'manager@vendorbridge.local',
      passwordHash: defaultPasswordHash,
      phone: '+919876543203',
      country: 'India',
      role: Role.MANAGER,
      additionalInfo: 'Procurement Department Manager & Approver',
    },
  });

  const vendorUser = await prisma.user.create({
    data: {
      firstName: 'Vikram',
      lastName: 'Patel',
      email: 'vendor@vendorbridge.local',
      passwordHash: defaultPasswordHash,
      phone: '+919876543204',
      country: 'India',
      role: Role.VENDOR,
      additionalInfo: 'Supplier representative for Apex Tech',
    },
  });

  console.log('✅ Seeded 4 demo accounts (Password for all: Password@123):');
  console.log('   - Admin: admin@vendorbridge.local');
  console.log('   - Procurement Officer: officer@vendorbridge.local');
  console.log('   - Manager / Approver: manager@vendorbridge.local');
  console.log('   - Vendor: vendor@vendorbridge.local');

  // 2. Seed ~25 Vendors across all statuses and categories
  const sampleVendors = [
    {
      name: 'Infra Supplies Pvt Ltd',
      category: 'Construction',
      gstNumber: '27AABCS1429B1Z0',
      contactName: 'Rajesh Sharma',
      contactEmail: 'contact@infrasupplies.co.in',
      contactPhone: '+919820011223',
      address: 'Plot 42, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093',
      notes: 'Premier cement and structural steel provider.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Apex Technologies Solutions',
      category: 'IT Hardware',
      gstNumber: '29ABCDE1234F1Z5',
      contactName: 'Ananya Deshmukh',
      contactEmail: 'sales@apextech.in',
      contactPhone: '+919845012345',
      address: '7th Floor, Electronic City Phase 1, Bengaluru, Karnataka 560100',
      notes: 'Enterprise laptops, servers, and networking hardware provider.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'BlueStar Office Comforts',
      category: 'Furniture',
      gstNumber: '07AAACB9876A1Z2',
      contactName: 'Manish Verma',
      contactEmail: 'orders@bluestarcomforts.com',
      contactPhone: '+919811098765',
      address: 'B-12, Okhla Industrial Area Phase II, New Delhi 110020',
      notes: 'Ergonomic workstations, conference chairs, and filing cabinets.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'QuickLogistics Express',
      category: 'Logistics',
      gstNumber: '33AABCL5544K1Z9',
      contactName: 'Karthik Raja',
      contactEmail: 'dispatch@quicklogistics.in',
      contactPhone: '+919840055443',
      address: '104, Mount Road, Guindy, Chennai, Tamil Nadu 600032',
      notes: 'Pan-India freight and express shipping partner.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'CyberShield IT Consulting',
      category: 'IT Services',
      gstNumber: '36AABCC7788P1Z3',
      contactName: 'Sneha Reddy',
      contactEmail: 'security@cybershield.io',
      contactPhone: '+919989077881',
      address: 'Hitech City, Madhapur, Hyderabad, Telangana 500081',
      notes: 'SOC compliance, cloud audits, and penetration testing services.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Evergreen Stationery Hub',
      category: 'Stationery',
      gstNumber: '24AAACE1122M1Z8',
      contactName: 'Bhavin Patel',
      contactEmail: 'supplies@evergreenstationery.com',
      contactPhone: '+919825011224',
      address: 'Sector 25, GIDC Industrial Estate, Gandhinagar, Gujarat 382025',
      notes: 'Paper, bulk printing, custom branded stationary, notebooks.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Metro Concrete Works',
      category: 'Construction',
      gstNumber: '27AABCM8899D1Z4',
      contactName: 'Sunil Kadam',
      contactEmail: 'info@metroconcrete.co.in',
      contactPhone: '+919822088995',
      address: 'Wadala Truck Terminal, Mumbai, Maharashtra 400037',
      notes: 'Ready-mix concrete and civil construction consumables.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Quantum Cloud Integrators',
      category: 'IT Services',
      gstNumber: '06AAACQ4321H1Z6',
      contactName: 'Pooja Agarwal',
      contactEmail: 'partnerships@quantumcloud.in',
      contactPhone: '+919810043210',
      address: 'DLF Cyber City, Tower B, Gurugram, Haryana 122002',
      notes: 'AWS and Azure managed infrastructure specialists.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'National Paper Mills Ltd',
      category: 'Stationery',
      gstNumber: '19AAACN9988C1Z7',
      contactName: 'Debabrata Mukherjee',
      contactEmail: 'b2b@nationalpapermills.com',
      contactPhone: '+919830099882',
      address: 'Strand Road, Dalhousie, Kolkata, West Bengal 700001',
      notes: 'Bulk printing reams, eco-friendly Kraft paper, packaging cartons.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Delta Freight Logistics',
      category: 'Logistics',
      gstNumber: '27AABCD6677E1Z1',
      contactName: 'Nitin Sawant',
      contactEmail: 'booking@deltafreight.in',
      contactPhone: '+919821066778',
      address: 'JNPT Port Area, Nhava Sheva, Navi Mumbai, Maharashtra 400707',
      notes: 'Heavy equipment cargo transport and container logistics.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Zenith Workspaces & Interiors',
      category: 'Furniture',
      gstNumber: '29AAACZ2345L1Z4',
      contactName: 'Priya Sundaram',
      contactEmail: 'hello@zenithinteriors.in',
      contactPhone: '+919844023456',
      address: 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
      notes: 'Modular acoustic booths and ergonomic conference desks.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Matrix Data Hardware',
      category: 'IT Hardware',
      gstNumber: '07AAACM6789J1Z9',
      contactName: 'Rohan Mehra',
      contactEmail: 'enterprise@matrixdata.in',
      contactPhone: '+919818067891',
      address: 'Nehru Place Commercial Complex, New Delhi 110019',
      notes: 'Direct distributor for HP, Dell, and Cisco equipment.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Shree Cement & Building Materials',
      category: 'Construction',
      gstNumber: '08AAACS3456G1Z3',
      contactName: 'Ramesh Choudhary',
      contactEmail: 'sales@shreebuildingmaterials.com',
      contactPhone: '+919414034567',
      address: 'RIICO Industrial Area, Mansarovar, Jaipur, Rajasthan 302020',
      notes: 'Aggregates, cement, sand, and brick supplier.',
      status: VendorStatus.PENDING,
    },
    {
      name: 'NovaTech Security Appliances',
      category: 'IT Hardware',
      gstNumber: '33AAACN8765B1Z1',
      contactName: 'Sanjay Krishnan',
      contactEmail: 'sales@novatechsecurity.in',
      contactPhone: '+919841087654',
      address: 'Tidel Park, Rajiv Gandhi Salai, Taramani, Chennai 600113',
      notes: 'Biometric access control terminals and CCTV surveillance.',
      status: VendorStatus.PENDING,
    },
    {
      name: 'Urban Move Courier Services',
      category: 'Logistics',
      gstNumber: '36AAACU3322D1Z0',
      contactName: 'Farhan Ali',
      contactEmail: 'support@urbanmove.co.in',
      contactPhone: '+919985033221',
      address: 'Gachibowli Outer Ring Road, Hyderabad, Telangana 500032',
      notes: 'Intra-city hyper-local parcel delivery and document logistics.',
      status: VendorStatus.PENDING,
    },
    {
      name: 'Heritage Woodcraft Artisans',
      category: 'Furniture',
      gstNumber: '08AAACH4567K1Z8',
      contactName: 'Mahendra Singh',
      contactEmail: 'heritage@woodcraftartisans.com',
      contactPhone: '+919413045678',
      address: 'Industrial Area, Boranada, Jodhpur, Rajasthan 342012',
      notes: 'Solid teak executive desks and custom hospitality seating.',
      status: VendorStatus.PENDING,
    },
    {
      name: 'Falcon Industrial Safety Gears',
      category: 'Other',
      gstNumber: '24AAACF5566R1Z5',
      contactName: 'Harish Thakkar',
      contactEmail: 'orders@falcongears.in',
      contactPhone: '+919824055662',
      address: 'Makarpura GIDC, Vadodara, Gujarat 390010',
      notes: 'PPE kits, hard hats, safety boots, and hazardous vests.',
      status: VendorStatus.PENDING,
    },
    {
      name: 'Prime Soft Solutions',
      category: 'IT Services',
      gstNumber: '27AAACP9911Q1Z6',
      contactName: 'Aditya Joshi',
      contactEmail: 'info@primesoftsolutions.com',
      contactPhone: '+919823099114',
      address: 'Hinjewadi IT Park Phase 2, Pune, Maharashtra 411057',
      notes: 'Custom ERP integrations, QA automation, and DevOps support.',
      status: VendorStatus.PENDING,
    },
    {
      name: 'Sunrise Print & Packaging',
      category: 'Stationery',
      gstNumber: '29AAACS4455F1Z2',
      contactName: 'Girish Kumar',
      contactEmail: 'print@sunrisepackaging.in',
      contactPhone: '+919846044553',
      address: 'Peenya Industrial Area Stage 1, Bengaluru, Karnataka 560058',
      notes: 'Corrugated cartons, bubble wrap, and promotional print material.',
      status: VendorStatus.PENDING,
    },
    {
      name: 'Blacklisted Freight Cargo',
      category: 'Logistics',
      gstNumber: '07AAACB1199X1Z4',
      contactName: 'Devender Sharma',
      contactEmail: 'compliance@blacklistedfreight.com',
      contactPhone: '+919812011993',
      address: 'Transport Nagar, Samalkha, New Delhi 110037',
      notes: 'Repeatedly failed delivery SLAs and contractual compliance violations.',
      status: VendorStatus.BLOCKED,
    },
    {
      name: 'Titan Steel Fabricators',
      category: 'Construction',
      gstNumber: '27AAACT2288Y1Z9',
      contactName: 'Ranjeet Rawat',
      contactEmail: 'admin@titansteelfab.co.in',
      contactPhone: '+919826022887',
      address: 'Bhosari MIDC, Pune, Maharashtra 411026',
      notes: 'De-listed due to counterfeit material quality audit failure.',
      status: VendorStatus.BLOCKED,
    },
    {
      name: 'Vanguard Electronics Infotech',
      category: 'IT Hardware',
      gstNumber: '33AAACV9900Z1Z7',
      contactName: 'Murali Nair',
      contactEmail: 'dispute@vanguardinfotech.in',
      contactPhone: '+919842099001',
      address: 'Ambattur Industrial Estate, Chennai, Tamil Nadu 600058',
      notes: 'Suspended pending ongoing GST tax evasion audit investigation.',
      status: VendorStatus.BLOCKED,
    },
    {
      name: 'Precision Instruments & Tools',
      category: 'Other',
      gstNumber: '24AAACP3344J1Z8',
      contactName: 'Ketan Shah',
      contactEmail: 'sales@precisiontools.in',
      contactPhone: '+919827033445',
      address: 'Aji GIDC, Industrial Area, Rajkot, Gujarat 360003',
      notes: 'Calibrated measuring tools, laser levels, and torque meters.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'Pinnacle Facilities & Maintenance',
      category: 'Other',
      gstNumber: '06AAACP8877K1Z5',
      contactName: 'Simran Walia',
      contactEmail: 'helpdesk@pinnaclefacilities.com',
      contactPhone: '+919813088774',
      address: 'Udyog Vihar Phase 4, Gurugram, Haryana 122016',
      notes: 'Facility housekeeping, HVAC maintenance, and electrical support.',
      status: VendorStatus.ACTIVE,
    },
    {
      name: 'OmniNet Telecom Infrastructure',
      category: 'IT Services',
      gstNumber: '27AAACO5533L1Z3',
      contactName: 'Tushar Shinde',
      contactEmail: 'noc@omninet.co.in',
      contactPhone: '+919828055332',
      address: 'Millennium Business Park, Mahape, Navi Mumbai 400710',
      notes: 'Leased line internet, VoIP SIP trunks, and fiber optic cabling.',
      status: VendorStatus.ACTIVE,
    },
  ];

  for (const v of sampleVendors) {
    await prisma.vendor.create({
      data: {
        ...v,
        createdById: officerUser.id,
      },
    });
  }

  console.log(`✅ Seeded ${sampleVendors.length} vendors across all statuses and categories.`);
  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
