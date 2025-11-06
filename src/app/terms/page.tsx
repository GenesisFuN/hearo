export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface rounded-lg p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-text-light mb-2">
            Terms of Service
          </h1>
          <p className="text-text-light/60 mb-8">
            Last Updated: {new Date().toLocaleDateString()}
          </p>

          <div className="space-y-8 text-text-light/80">
            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using Hearo ("the Service"), you accept and
                agree to be bound by the terms and provision of this agreement.
                If you do not agree to these terms, please do not use the
                Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                2. Content Rights and Ownership
              </h2>
              <h3 className="text-lg font-medium text-text-light mb-2">
                2.1 Your Content
              </h3>
              <p className="mb-4">
                You retain all rights to the content you upload to Hearo. By
                uploading content, you represent and warrant that:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>
                  You own or have the necessary rights to upload, publish, and
                  distribute the content
                </li>
                <li>
                  Your content does not infringe upon the intellectual property
                  rights, privacy rights, or any other rights of any third party
                </li>
                <li>Your content does not violate any law or regulation</li>
                <li>
                  Your content does not contain material that is unlawful,
                  harmful, threatening, abusive, harassing, defamatory,
                  pornographic, or otherwise objectionable
                </li>
              </ul>

              <h3 className="text-lg font-medium text-text-light mb-2">
                2.2 License to Hearo
              </h3>
              <p>
                By uploading content, you grant Hearo a non-exclusive,
                worldwide, royalty-free license to store, process, and display
                your content solely for the purpose of providing the Service to
                you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                3. Copyright Policy
              </h2>
              <h3 className="text-lg font-medium text-text-light mb-2">
                3.1 Prohibited Content
              </h3>
              <p className="mb-4">
                You may not upload, publish, or distribute content that:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>
                  Infringes on copyrights, trademarks, or other intellectual
                  property rights
                </li>
                <li>
                  Contains explicit, pornographic, or age-inappropriate material
                </li>
                <li>Promotes hate speech, violence, or discrimination</li>
                <li>Contains malware, viruses, or harmful code</li>
                <li>
                  Violates any applicable local, state, national, or
                  international law
                </li>
              </ul>

              <h3 className="text-lg font-medium text-text-light mb-2">
                3.2 Enforcement
              </h3>
              <p className="mb-4">
                Hearo reserves the right to remove any content that violates
                these terms or is deemed inappropriate at our sole discretion.
                Repeated violations may result in account suspension or
                termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                4. DMCA Copyright Infringement Notice
              </h2>
              <p className="mb-4">
                Hearo respects the intellectual property rights of others and
                expects users to do the same. In accordance with the Digital
                Millennium Copyright Act (DMCA), we will respond to valid
                notices of copyright infringement.
              </p>

              <h3 className="text-lg font-medium text-text-light mb-2">
                4.1 Filing a DMCA Takedown Notice
              </h3>
              <p className="mb-4">
                If you believe that content on Hearo infringes your copyright,
                please provide our DMCA Agent with a written notice containing:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>
                  A physical or electronic signature of the copyright owner or
                  authorized representative
                </li>
                <li>
                  Identification of the copyrighted work claimed to have been
                  infringed
                </li>
                <li>
                  Identification of the material that is claimed to be
                  infringing, with sufficient detail to locate it on the Service
                </li>
                <li>
                  Your contact information (address, telephone number, email)
                </li>
                <li>
                  A statement that you have a good faith belief that use of the
                  material is not authorized
                </li>
                <li>
                  A statement under penalty of perjury that the information is
                  accurate and you are authorized to act on behalf of the
                  copyright owner
                </li>
              </ul>

              <h3 className="text-lg font-medium text-text-light mb-2">
                4.2 DMCA Agent Contact
              </h3>
              <div className="bg-background/50 rounded p-4 mb-4">
                <p className="font-mono text-sm">
                  Email: dmca@hearo.app
                  <br />
                  Subject Line: DMCA Takedown Notice
                </p>
              </div>

              <h3 className="text-lg font-medium text-text-light mb-2">
                4.3 Counter-Notice
              </h3>
              <p>
                If you believe your content was removed in error, you may file a
                counter-notice with the same contact information. We will
                respond in accordance with DMCA procedures.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                5. User Conduct
              </h2>
              <p className="mb-4">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>
                  Use the Service for any unlawful purpose or in violation of
                  these Terms
                </li>
                <li>
                  Attempt to gain unauthorized access to any portion of the
                  Service
                </li>
                <li>
                  Interfere with or disrupt the Service or servers/networks
                  connected to the Service
                </li>
                <li>Upload viruses or any other malicious code</li>
                <li>
                  Impersonate any person or entity or misrepresent your
                  affiliation
                </li>
                <li>
                  Harvest or collect information about users without their
                  consent
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                6. Account Termination
              </h2>
              <p>
                Hearo reserves the right to suspend or terminate your account at
                any time, with or without notice, for conduct that we believe:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4 mt-2">
                <li>Violates these Terms of Service</li>
                <li>Is harmful to other users, Hearo, or third parties</li>
                <li>Violates applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                7. Disclaimer of Warranties
              </h2>
              <p className="mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT
                NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p>
                Hearo does not warrant that the Service will be uninterrupted,
                secure, or error-free, or that defects will be corrected.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                8. Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, HEARO SHALL NOT BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
                INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE,
                GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                9. Indemnification
              </h2>
              <p>
                You agree to indemnify, defend, and hold harmless Hearo, its
                officers, directors, employees, and agents from any claims,
                liabilities, damages, losses, and expenses, including reasonable
                attorney's fees, arising out of or in any way connected with
                your access to or use of the Service, your content, or your
                violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                10. Changes to Terms
              </h2>
              <p>
                Hearo reserves the right to modify these Terms at any time. We
                will notify users of material changes via email or through the
                Service. Your continued use of the Service after such
                modifications constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                11. Governing Law
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance
                with the laws of the United States, without regard to its
                conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-text-light mb-4">
                12. Contact Information
              </h2>
              <p className="mb-2">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-background/50 rounded p-4">
                <p className="font-mono text-sm">
                  Email: legal@hearo.app
                  <br />
                  Support: support@hearo.app
                </p>
              </div>
            </section>

            <section className="pt-8 border-t border-accent/20">
              <p className="text-sm text-text-light/60 text-center">
                By using Hearo, you acknowledge that you have read, understood,
                and agree to be bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
